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
import { initLogger } from "./utils/logger";

/**
 * Activates the extension by registering all providers and listeners.
 * @param context The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
  const log = initLogger(constants.EXTENSION_DISPLAY_NAME);
  log.trace("Extension activated", context.extension.id);

  context.subscriptions.push(
    log,
    initializeRobotsTxtAstAsyncCache(),
    RobotsTxtCodeActionProvider.register(),
    RobotsTxtCodelensProvider.register(),
    RobotsTxtCompletionItemProvider.register(),
    RobotsTxtDiagnosticUpdater.register(200),
    RobotsTxtDocumentFormattingEditProvider.register(),
    RobotsTxtDocumentRangeFormattingEditProvider.register(),
    RobotsTxtFoldingRangeProvider.register(),
    RobotsTxtHoverProvider.register(),
    RobotsTxtOnTypeFormattingEditProvider.register(),
    RobotsTxtRegionDecorator.register(100),
    RobotsTxtSignatureHelpProvider.register(),
  );
}

/**
 * Deactivates the extension.
 */
export function deactivate() {}
