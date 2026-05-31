import * as vscode from "vscode";
import { RobotsTxtCompletionItemProvider } from "./completion";
import { RobotsTxtFoldingRangeProvider } from "./folding";
import { RobotsTxtSignatureHelpProvider } from "./signature";
import { RobotsTxtHoverProvider } from "./hover";
import { collectDiagnostics } from "./diagnostic";
import * as constants from "./constants";

export function activate(context: vscode.ExtensionContext) {
  // Register the completion item provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      constants.LANGUAGE_ID,
      new RobotsTxtCompletionItemProvider(),
    ),
  );

  // Register the folding range provider
  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider(
      constants.LANGUAGE_ID,
      new RobotsTxtFoldingRangeProvider(),
    ),
  );

  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider(
      constants.LANGUAGE_ID,
      new RobotsTxtSignatureHelpProvider(),
      " ",
      ":",
    ),
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      constants.LANGUAGE_ID,
      new RobotsTxtHoverProvider(),
    ),
  );

  // Register the diagnostic collection updater
  let timeout: NodeJS.Timeout | null = null;
  const diagnostics = vscode.languages.createDiagnosticCollection(
    constants.LANGUAGE_ID,
  );
  context.subscriptions.push(diagnostics);
  const diagnosticUpdate = (document: vscode.TextDocument) => {
    if (document.languageId === constants.LANGUAGE_ID) {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        collectDiagnostics(document, diagnostics);
      }, 200);
    }
  };
  if (vscode.window.activeTextEditor) {
    diagnosticUpdate(vscode.window.activeTextEditor.document);
  }
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(diagnosticUpdate),
    vscode.workspace.onDidSaveTextDocument(diagnosticUpdate),
    vscode.workspace.onDidChangeTextDocument((event) =>
      diagnosticUpdate(event.document),
    ),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        diagnosticUpdate(editor.document);
      }
    }),
  );
}

export function deactivate() {}
