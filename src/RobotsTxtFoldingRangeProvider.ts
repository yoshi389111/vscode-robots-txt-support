import * as vscode from "vscode";
import { parseRobotsTxt } from "./parser/documentParser";
import { getLogger } from "./utils/logger";

/** Provides folding ranges for `robots.txt` files. */
export class RobotsTxtFoldingRangeProvider
  implements vscode.FoldingRangeProvider
{
  /** The logger instance. */
  private readonly log = getLogger();

  /**
   * Provides folding ranges for the given document.
   * @param document The text document for which to provide folding ranges.
   * @param _context The folding context.
   * @param _token A cancellation token.
   * @returns An array of folding ranges for the document.
   */
  public provideFoldingRanges(
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    this.log.trace("Providing folding ranges for document", document.fileName);
    try {
      // parse the robots.txt file
      const astRoot = parseRobotsTxt(document);
      // create folding ranges
      return astRoot.groups.map(
        (group) =>
          new vscode.FoldingRange(
            group.startLine,
            group.endLine,
            vscode.FoldingRangeKind.Region,
          ),
      );
    } catch (error) {
      this.log.error("Error providing folding ranges for document", error);
      return [];
    } finally {
      this.log.trace("Finished providing folding ranges for document");
    }
  }
}
