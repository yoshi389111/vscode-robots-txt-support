import * as vscode from "vscode";
import * as constants from "./data/constants";
import { formatRange } from "./RobotsTxtFormatter";
import { getLogger } from "./utils/logger";

/** Provides formatting edits for a specific range in robots.txt documents. */
export class RobotsTxtDocumentRangeFormattingEditProvider
  implements vscode.DocumentRangeFormattingEditProvider
{
  /** The logger instance. */
  private readonly log = getLogger();

  /**
   * Registers the document range formatting edit provider for `robots.txt` files.
   * @returns A disposable that can be used to unregister the provider
   */
  public static register(): vscode.Disposable {
    return vscode.languages.registerDocumentRangeFormattingEditProvider(
      constants.LANGUAGE_ID,
      new RobotsTxtDocumentRangeFormattingEditProvider(),
    );
  }

  /**
   * Provides formatting edits for a specific range in the document.
   * @param document The document to format.
   * @param range The range within the document to format.
   * @param _options The formatting options.
   * @param _token A cancellation token.
   * @returns An array of text edits to apply to the specified range in the document.
   */
  public provideDocumentRangeFormattingEdits(
    document: vscode.TextDocument,
    range: vscode.Range,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    this.log.trace(
      "Providing document range formatting edits",
      document.fileName,
      range.start.line,
      range.end.line,
    );
    try {
      return formatRange(document, range);
    } catch (error) {
      this.log.error("Error providing document range formatting edits", error);
      return [];
    } finally {
      this.log.trace("Finished providing document range formatting edits");
    }
  }
}
