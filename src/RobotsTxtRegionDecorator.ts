import * as vscode from "vscode";
import * as constants from "./data/constants";
import { getAst } from "./RobotsTxtAstAsyncCache";
import { DelayExecutor } from "./utils/DelayExecutor";

/** Provides decorations for regions in robots.txt documents. */
export class RobotsTxtRegionDecorator implements vscode.Disposable {
  /** The decoration type used for disallowed regions. */
  private readonly decorationType =
    vscode.window.createTextEditorDecorationType({
      opacity: "0.7",
    });

  /**
   * Registers the region decorator for `robots.txt` files.
   * @param delayTime The delay in milliseconds before updating decorations after an event is triggered
   * @returns A disposable that can be used to unregister the decorator and its listeners
   */
  public static register(delayTime: number): vscode.Disposable {
    const decorator = new RobotsTxtRegionDecorator();
    const delayExecutor = new DelayExecutor();
    const delayExecute = (editor: vscode.TextEditor) => {
      delayExecutor.execute(
        () => decorator.updateDecorations(editor),
        delayTime,
      );
    };

    const selectionChangeDisposable =
      vscode.window.onDidChangeTextEditorSelection((event) =>
        delayExecute(event.textEditor),
      );

    const editorSwitchDisposable = vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor) {
          delayExecute(editor);
        }
      },
    );

    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        const editor = vscode.window.activeTextEditor;
        if (event.document === editor?.document) {
          delayExecute(editor);
        }
      },
    );

    // Initial decoration update for the currently active editor
    if (vscode.window.activeTextEditor) {
      delayExecute(vscode.window.activeTextEditor);
    }

    return vscode.Disposable.from(
      decorator,
      delayExecutor,
      selectionChangeDisposable,
      editorSwitchDisposable,
      documentChangeDisposable,
    );
  }

  /**
   * Updates the decorations for the given text editor based on the current cursor position and the structure of the robots.txt document.
   * @param editor The text editor for which to update the decorations.
   * @returns A promise that resolves when the decorations have been updated.
   */
  private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    if (document.languageId !== constants.LANGUAGE_ID) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const ast = await getAst(document).catch((_error) => {
      editor.setDecorations(this.decorationType, []);
      return undefined;
    });
    if (!ast) {
      return;
    }

    const cursorLineNo = editor.selection.active.line;
    const disallowedRegions: vscode.DecorationOptions[] = [];

    for (const group of ast.groups) {
      if (group.startLine <= cursorLineNo && cursorLineNo <= group.endLine) {
        if (0 < group.startLine) {
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            document.lineAt(group.startLine - 1).range.end,
          );
          disallowedRegions.push({ range });
        }
        if (group.endLine < document.lineCount - 1) {
          const range = new vscode.Range(
            new vscode.Position(group.endLine + 1, 0),
            document.lineAt(document.lineCount - 1).range.end,
          );
          disallowedRegions.push({ range });
        }
        break;
      }
    }
    editor.setDecorations(this.decorationType, disallowedRegions);
  }

  /** Disposes of the resources used by the decorator. */
  public dispose(): void {
    this.decorationType.dispose();
  }
}
