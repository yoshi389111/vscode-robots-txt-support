import * as vscode from "vscode";
import { getAst } from "./RobotsTxtAstAsyncCache";
import { DelayExecutor } from "./utils/DelayExecutor";
import * as constants from "./data/constants";

/** Provides decorations for regions in robots.txt documents. */
export class RobotsTxtRegionDecorator implements vscode.Disposable {
  /** The list of disposables to be cleaned up when the decorator is disposed. */
  private readonly disposables: vscode.Disposable[] = [];
  /** The delay executor used to debounce decoration updates. */
  private readonly delayExecutor = new DelayExecutor();
  /** The decoration type used for disallowed regions. */
  private readonly disallowedDecorationType =
    vscode.window.createTextEditorDecorationType({
      opacity: "0.7",
    });

  /**
   * Initializes a new instance of the RobotsTxtRegionDecorator class.
   * Registers event listeners to update decorations when the active editor changes,
   * when the text selection changes, or when the document changes.
   * Also performs an initial decoration update for the currently active editor.
   */
  constructor() {
    // Register the decoration type for disallowed paths
    this.disposables.push(this.disallowedDecorationType);

    const updateDecorations = (editor: vscode.TextEditor) => {
      this.delayExecutor.execute(() => this.updateDecorations(editor), 100);
    };

    vscode.window.onDidChangeTextEditorSelection(
      (event) => updateDecorations(event.textEditor),
      null,
      this.disposables,
    );

    vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor) {
          updateDecorations(editor);
        }
      },
      null,
      this.disposables,
    );

    vscode.workspace.onDidChangeTextDocument(
      async (event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          updateDecorations(editor);
        }
      },
      null,
      this.disposables,
    );

    // Initial decoration update for the currently active editor
    if (vscode.window.activeTextEditor) {
      updateDecorations(vscode.window.activeTextEditor);
    }
  }

  /**
   * Updates the decorations for the given text editor based on the current cursor position and the structure of the robots.txt document.
   * @param editor The text editor for which to update the decorations.
   * @returns A promise that resolves when the decorations have been updated.
   */
  private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    if (document.languageId !== constants.LANGUAGE_ID) {
      editor.setDecorations(this.disallowedDecorationType, []);
      return;
    }

    const ast = await getAst(document).catch((_error) => {
      editor.setDecorations(this.disallowedDecorationType, []);
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
    editor.setDecorations(this.disallowedDecorationType, disallowedRegions);
  }

  /** Disposes of the resources used by the decorator. */
  public dispose(): void {
    this.delayExecutor.cancel();
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }
}
