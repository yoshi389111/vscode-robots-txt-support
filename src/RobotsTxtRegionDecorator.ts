import * as vscode from "vscode";
import { getAst } from "./RobotsTxtAstAsyncCache";
import { DelayExecutor } from "./utils/DelayExecutor";

export class RobotsTxtRegionDecorator implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly disallowedDecorationType =
    vscode.window.createTextEditorDecorationType({
      opacity: "0.7",
    });

  constructor() {
    // Register the decoration type for disallowed paths
    this.disposables.push(this.disallowedDecorationType);

    const delayExecutor = new DelayExecutor();

    const updateDecorations = (editor: vscode.TextEditor) => {
      delayExecutor.execute(() => this.updateDecorations(editor), 100);
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

  private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    if (document.languageId !== "robots-txt") {
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
            new vscode.Position(group.startLine - 1, 0),
          );
          disallowedRegions.push({ range });
        }
        if (group.endLine < document.lineCount - 1) {
          const range = new vscode.Range(
            new vscode.Position(group.endLine + 1, 0),
            new vscode.Position(document.lineCount - 1, 0),
          );
          disallowedRegions.push({ range });
        }
        break;
      }
    }
    editor.setDecorations(this.disallowedDecorationType, disallowedRegions);
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }
}
