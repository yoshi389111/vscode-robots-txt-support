import * as vscode from "vscode";
import { parseRobotsTxt, AstDirective } from "./parser/documentParser";
import { getLogger } from "./utils/logger";
import { CRAWLER_LOOKUP, CrawlerInfo } from "./data/crawlerInfo";

const COMMAND_ID =
  "robots-txt-support.RobotsTxtCodelensProvider.showCrawlerInfo";

interface RobotsTxtQuickPickItem extends vscode.QuickPickItem {
  openUrl?: string;
}

export class RobotsTxtCodelensProvider
  implements vscode.CodeLensProvider, vscode.Disposable
{
  private readonly log = getLogger();
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.log.trace("RobotsTxtCodelensProvider initialized");
    const disposable = vscode.commands.registerCommand(
      COMMAND_ID,
      (crawlerInfo: CrawlerInfo) => this.showCrawlerInfo(crawlerInfo),
    );
    this.disposables.push(disposable);
  }

  private async showCrawlerInfo(crawlerInfo: CrawlerInfo) {
    this.log.trace("Showing crawler info", crawlerInfo.name);

    const quickPickItems: RobotsTxtQuickPickItem[] = [
      {
        label: "Description",
        detail: crawlerInfo.description,
        iconPath: new vscode.ThemeIcon("info"),
      },
    ];

    if (crawlerInfo.url) {
      quickPickItems.push({
        label: "Open Documentation",
        description: crawlerInfo.url,
        detail: "Click to open the crawler's documentation in browser",
        iconPath: new vscode.ThemeIcon("ports-open-browser-icon"),
        openUrl: crawlerInfo.url,
      });
    }

    const result = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: `Information about ${crawlerInfo.name}`,
    });

    if (result?.openUrl) {
      vscode.env.openExternal(vscode.Uri.parse(result.openUrl));
    }
  }

  public dispose() {
    this.log.trace("Disposing RobotsTxtCodelensProvider");
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    this.log.trace("Providing code lenses", document.fileName);
    try {
      const codeLenses: vscode.CodeLens[] = [];
      const ast = parseRobotsTxt(document);
      for (const group of ast.groups) {
        for (const userAgent of group.userAgents) {
          const codelens = this.codelensCrawler(userAgent);
          if (codelens) {
            codeLenses.push(codelens);
          }
        }
      }
      return codeLenses;
    } catch (error) {
      this.log.error("Error providing code lenses", error);
      return undefined;
    } finally {
      this.log.trace("Finished providing code lenses");
    }
  }

  private codelensCrawler(
    userAgent: AstDirective,
  ): vscode.CodeLens | undefined {
    const userAgentSpan = userAgent.params[0];
    if (!userAgentSpan) {
      return undefined;
    }
    const userAgentKey = userAgentSpan.text.toLowerCase();
    const crawlerInfo = this.getCrawlerInfo(userAgentKey);
    if (!crawlerInfo || crawlerInfo.hiddenHover) {
      return undefined;
    }
    const codelens = new vscode.CodeLens(userAgentSpan.range, {
      title: `# ${crawlerInfo.description}`,
      command: COMMAND_ID,
      arguments: [crawlerInfo],
    });
    return codelens;
  }

  private getCrawlerInfo(userAgentKey: string): CrawlerInfo | undefined {
    const crawlerInfo = CRAWLER_LOOKUP[userAgentKey];
    if (!crawlerInfo || crawlerInfo.hiddenHover) {
      return undefined;
    }
    if (!crawlerInfo.inheritsFromKey) {
      return crawlerInfo;
    }
    const baseCrawlerInfo = CRAWLER_LOOKUP[crawlerInfo.inheritsFromKey];
    if (!baseCrawlerInfo) {
      return crawlerInfo;
    }
    return { ...baseCrawlerInfo, ...crawlerInfo };
  }
}
