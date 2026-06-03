import * as vscode from "vscode";
import { parseRobotsTxt } from "./parser/documentParser";
import { getLogger } from "./utils/logger";

export class RobotsTxtFoldingRangeProvider
  implements vscode.FoldingRangeProvider
{
  private readonly log = getLogger();

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
