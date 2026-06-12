import * as vscode from "vscode";
import * as constants from "./data/constants";
import { initialize as initializeRobotsTxtAstAsyncCache } from "./RobotsTxtAstAsyncCache";
import { RobotsTxtCodeActionProvider } from "./RobotsTxtCodeActionProvider";
import { RobotsTxtCodelensProvider } from "./RobotsTxtCodelensProvider";
import { RobotsTxtCompletionItemProvider } from "./RobotsTxtCompletionItemProvider";
import { RobotsTxtDiagnosticUpdater } from "./RobotsTxtDiagnosticUpdater";
import { RobotsTxtDocumentFormattingEditProvider } from "./RobotsTxtDocumentFormattingEditProvider";
import { RobotsTxtDocumentRangeFormattingEditProvider } from "./RobotsTxtDocumentRangeFormattingEditProvider";
import { RobotsTxtFoldingRangeProvider } from "./RobotsTxtFoldingRangeProvider";
import { RobotsTxtHoverProvider } from "./RobotsTxtHoverProvider";
import { RobotsTxtOnTypeFormattingEditProvider } from "./RobotsTxtOnTypeFormattingEditProvider";
import { RobotsTxtRegionDecorator } from "./RobotsTxtRegionDecorator";
import { RobotsTxtSignatureHelpProvider } from "./RobotsTxtSignatureHelpProvider";
import { DelayExecutor } from "./utils/DelayExecutor";
import { initLogger } from "./utils/logger";

/**
 * Activates the extension by registering all providers and listeners.
 * @param context The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(...initializeExtension(context));
}

/**
 * Deactivates the extension.
 */
export function deactivate() {}

/**
 * Initializes the extension by registering all providers and listeners.
 * To push all at once with `activate`, Disposable is returned sequentially.
 * @param context The extension context provided by VS Code
 * @returns An iterable yielding disposables for all registered providers and listeners
 */
function* initializeExtension(
  context: vscode.ExtensionContext,
): Iterable<vscode.Disposable> {
  // Initialize the logger and log the activation event
  const log = initLogger(constants.EXTENSION_DISPLAY_NAME);
  yield log;
  log.trace("Extension activated", context.extension.id);

  // Initialize the AST cache for robots.txt files
  yield initializeRobotsTxtAstAsyncCache();

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

  // Register the code action provider
  yield vscode.languages.registerCodeActionsProvider(
    constants.LANGUAGE_ID,
    new RobotsTxtCodeActionProvider(),
    RobotsTxtCodeActionProvider.metadata,
  );

  const codelensProvider = new RobotsTxtCodelensProvider();
  yield codelensProvider;
  yield vscode.languages.registerCodeLensProvider(
    constants.LANGUAGE_ID,
    codelensProvider,
  );

  // Register the document formatting edit provider
  yield vscode.languages.registerDocumentFormattingEditProvider(
    constants.LANGUAGE_ID,
    new RobotsTxtDocumentFormattingEditProvider(),
  );

  // Register the document range formatting edit provider
  yield vscode.languages.registerDocumentRangeFormattingEditProvider(
    constants.LANGUAGE_ID,
    new RobotsTxtDocumentRangeFormattingEditProvider(),
  );

  yield vscode.languages.registerOnTypeFormattingEditProvider(
    constants.LANGUAGE_ID,
    new RobotsTxtOnTypeFormattingEditProvider(),
    "\n",
  );

  yield new RobotsTxtRegionDecorator();

  // Register the diagnostic collection updater
  const diagnostics = vscode.languages.createDiagnosticCollection(
    constants.LANGUAGE_ID,
  );
  yield diagnostics;

  const diagnosticUpdater = new RobotsTxtDiagnosticUpdater();
  const delayExecutor = new DelayExecutor();
  const diagnosticUpdate = (
    document: vscode.TextDocument,
    similarityCheck = false,
  ) => {
    if (document.languageId === constants.LANGUAGE_ID || similarityCheck) {
      delayExecutor.execute(
        () => diagnosticUpdater.update(document, diagnostics),
        200,
      );
    }
  };

  // Initial diagnostics collection for the active editor
  if (vscode.window.activeTextEditor) {
    diagnosticUpdate(vscode.window.activeTextEditor.document, true);
  }
  // Listen to document opens and update diagnostics
  yield vscode.workspace.onDidOpenTextDocument((document) =>
    diagnosticUpdate(document, true),
  );
  // Listen to document saves and update diagnostics
  yield vscode.workspace.onDidSaveTextDocument(diagnosticUpdate);
  // Listen to document closures and update diagnostics
  yield vscode.workspace.onDidCloseTextDocument(diagnosticUpdate);
  // Listen to document changes and update diagnostics
  yield vscode.workspace.onDidChangeTextDocument((event) => {
    diagnosticUpdate(event.document);
  });
  // Listen to active editor changes and update diagnostics
  yield vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      diagnosticUpdate(editor.document);
    }
  });

  // Listen to file deletions and delete diagnostics
  yield vscode.workspace.onDidDeleteFiles((event) => {
    event.files.forEach((uri) => diagnostics.delete(uri));
  });
  // Listen to file renames and delete diagnostics for old URIs
  yield vscode.workspace.onDidRenameFiles((event) => {
    event.files.forEach((files) => diagnostics.delete(files.oldUri));
  });
}
