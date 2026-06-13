import * as vscode from "vscode";
import * as constants from "./data/constants";
import { formatRange } from "./RobotsTxtFormatter";
import { getLogger } from "./utils/logger";

/** Provides formatting edits for robots.txt documents. */
export class RobotsTxtDocumentFormattingEditProvider
  implements vscode.DocumentFormattingEditProvider
{
  /** The logger instance. */
  private readonly log = getLogger();

  /**
   * Registers the document formatting edit provider for `robots.txt` files.
   * @returns A disposable that can be used to unregister the provider
   */
  public static register(): vscode.Disposable {
    return vscode.languages.registerDocumentFormattingEditProvider(
      constants.LANGUAGE_ID,
      new RobotsTxtDocumentFormattingEditProvider(),
    );
  }

  /**
   * Provides formatting edits for the entire document.
   * @param document The document to format.
   * @param _options The formatting options.
   * @param _token A cancellation token.
   * @returns An array of text edits to apply to the document.
   */
  public provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    this.log.trace("Providing document formatting edits", document.fileName);
    try {
      return formatRange(
        document,
        new vscode.Range(0, 0, document.lineCount - 1, 0),
      );
    } catch (error) {
      this.log.error("Error providing document formatting edits", error);
      return [];
    } finally {
      this.log.trace("Finished providing document formatting edits");
    }
  }
}
