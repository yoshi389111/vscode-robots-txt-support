import * as vscode from "vscode";
import { parseRobotsTxt, AstDirective } from "./parser/documentParser";
import { getLogger } from "./utils/logger";
import { CRAWLER_LOOKUP, CrawlerInfo } from "./data/crawlerInfo";

/** Internal command ID for showing crawler information. */
const INTERNAL_COMMAND_ID =
  "robots-txt-support.RobotsTxtCodelensProvider.showCrawlerInfo";

/**
 * Defines the structure of a quick pick item used in the crawler information quick pick.
 */
interface RobotsTxtQuickPickItem extends vscode.QuickPickItem {
  /** The URL to open when the quick pick item is selected. */
  openUrl?: string;
}

/** Provides code lenses for robots.txt files. */
export class RobotsTxtCodelensProvider
  implements vscode.CodeLensProvider, vscode.Disposable
{
  /** The logger instance. */
  private readonly log = getLogger();

  /** The list of registered disposables. */
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.log.trace("RobotsTxtCodelensProvider initialized");
    const disposable = vscode.commands.registerCommand(
      INTERNAL_COMMAND_ID,
      (crawlerInfo: CrawlerInfo) => this.showCrawlerInfo(crawlerInfo),
    );
    this.disposables.push(disposable);
  }

  /**
   * Displays a quick pick with information about the crawler and an option to open its documentation if available.
   * @param crawlerInfo The information about the crawler to display in the quick pick.
   */
  private async showCrawlerInfo(crawlerInfo: CrawlerInfo): Promise<void> {
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

  /** Disposes of the resources used by the code lens provider. */
  public dispose() {
    this.log.trace("Disposing RobotsTxtCodelensProvider");
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }

  /**
   * Provides code lenses for user agent directives in the robots.txt document.
   * @param document The text document containing the robots.txt content.
   * @param _token A cancellation token.
   * @returns An array of code lenses or undefined if an error occurs.
   */
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

  /**
   * Generates a code lens for a given user agent directive.
   * @param userAgent The user agent directive for which to generate the code lens.
   * @returns A vscode.CodeLens object with crawler information or undefined if no information is available.
   */
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
      command: INTERNAL_COMMAND_ID,
      arguments: [crawlerInfo],
    });
    return codelens;
  }

  /**
   * Retrieves crawler information based on the user agent key.
   * @param userAgentKey The user agent key to look up.
   * @returns The crawler information or undefined if not found or hidden.
   */
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
