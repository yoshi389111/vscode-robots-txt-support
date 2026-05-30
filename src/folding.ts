import * as vscode from "vscode";
import { parseRobotsTxt } from "./parser";

export class RobotsTxtFoldingRangeProvider
  implements vscode.FoldingRangeProvider
{
  public provideFoldingRanges(
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.FoldingRange[]> {
    // parse the robots.txt file
    const astRoot = parseRobotsTxt(document);
    // create folding ranges
    const foldingRanges = astRoot.groups.map(
      (group) =>
        new vscode.FoldingRange(
          group.startLine,
          group.endLine,
          vscode.FoldingRangeKind.Region,
        ),
    );
    return foldingRanges;
  }
}
