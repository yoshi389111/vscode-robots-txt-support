import * as vscode from "vscode";
import { RobotsTxtCompletionItemProvider } from "./RobotsTxtCompletionItemProvider";
import { RobotsTxtFoldingRangeProvider } from "./RobotsTxtFoldingRangeProvider";
import { RobotsTxtSignatureHelpProvider } from "./RobotsTxtSignatureHelpProvider";
import { RobotsTxtHoverProvider } from "./RobotsTxtHoverProvider";
import { RobotsTxtDiagnosticUpdater } from "./RobotsTxtDiagnosticUpdater";
import { DelayExecutor } from "./utils/DelayExecutor";
import { initLogger } from "./utils/logger";
import * as constants from "./data/constants";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(...initializeExtension(context));
}

export function deactivate() {}

/**
 * Initializes the extension by registering all providers and listeners.
 * To push all at once with `activate`, Disposable is returned sequentially.
 * @param context The extension context provided by VS Code
 * @returns A generator yielding disposables for all registered providers and listeners
 */
function* initializeExtension(
  context: vscode.ExtensionContext,
): Iterable<vscode.Disposable> {
  // Initialize the logger and log the activation event
  const log = initLogger(constants.EXTENSION_DISPLAY_NAME);
  yield log;
  log.trace("Extension activated", context.extension.id);

  // Register the completion item provider
  yield vscode.languages.registerCompletionItemProvider(
    constants.LANGUAGE_ID,
    new RobotsTxtCompletionItemProvider(),
  );

  // Register the folding range provider
  yield vscode.languages.registerFoldingRangeProvider(
    constants.LANGUAGE_ID,
    new RobotsTxtFoldingRangeProvider(),
  );

  // Register the signature help provider
  yield vscode.languages.registerSignatureHelpProvider(
    constants.LANGUAGE_ID,
    new RobotsTxtSignatureHelpProvider(),
    " ",
    ":",
  );

  // Register the hover provider
  yield vscode.languages.registerHoverProvider(
    constants.LANGUAGE_ID,
    new RobotsTxtHoverProvider(),
  );

  // Register the diagnostic collection updater
  const diagnostics = vscode.languages.createDiagnosticCollection(
    constants.LANGUAGE_ID,
  );
  yield diagnostics;

  const diagnosticUpdater = new RobotsTxtDiagnosticUpdater();
  const delayExecutor = new DelayExecutor();
  const diagnosticUpdate = (document: vscode.TextDocument) => {
    if (document.languageId === constants.LANGUAGE_ID) {
      delayExecutor.execute(
        () => diagnosticUpdater.update(document, diagnostics),
        200,
      );
    }
  };

  // Initial diagnostics collection for the active editor
  if (vscode.window.activeTextEditor) {
    diagnosticUpdate(vscode.window.activeTextEditor.document);
  }
  // Listen to document opens and update diagnostics
  yield vscode.workspace.onDidOpenTextDocument(diagnosticUpdate);
  // Listen to document saves and update diagnostics
  yield vscode.workspace.onDidSaveTextDocument(diagnosticUpdate);
  // Listen to document changes and update diagnostics
  yield vscode.workspace.onDidChangeTextDocument((event) =>
    diagnosticUpdate(event.document),
  );
  // Listen to active editor changes and update diagnostics
  yield vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      diagnosticUpdate(editor.document);
    }
  });

  // Listen to document closures and update diagnostics
  yield vscode.workspace.onDidCloseTextDocument((document) => {
    diagnostics.delete(document.uri);
  });
  // Listen to file deletions and update diagnostics
  yield vscode.workspace.onDidDeleteFiles((event) => {
    event.files.forEach((uri) => diagnostics.delete(uri));
  });
  // Listen to file renames and update diagnostics
  yield vscode.workspace.onDidRenameFiles((event) => {
    event.files.forEach((file) => diagnostics.delete(file.oldUri));
  });
}
