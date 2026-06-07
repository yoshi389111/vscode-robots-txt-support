import * as vscode from "vscode";
import { getAst } from "./RobotsTxtAstAsyncCache";
import { AstDirective } from "./parser/documentParser";
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
        label: vscode.l10n.t("Description"),
        detail: crawlerInfo.description,
        iconPath: new vscode.ThemeIcon("info"),
      },
    ];

    if (crawlerInfo.notice) {
      quickPickItems.push({
        label: vscode.l10n.t("Notice"),
        detail: crawlerInfo.notice,
        iconPath: new vscode.ThemeIcon("warning"),
      });
    }

    if (crawlerInfo.url) {
      quickPickItems.push({
        label: vscode.l10n.t("Open Documentation"),
        description: crawlerInfo.url,
        detail: vscode.l10n.t(
          "Click to open the crawler's documentation in the browser",
        ),
        iconPath: new vscode.ThemeIcon("book"),
        openUrl: crawlerInfo.url,
      });
    }

    const result = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: vscode.l10n.t("Information about {0}", crawlerInfo.name),
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
   * @returns An array of code lenses. If an error occurs, returns an empty array.
   */
  public async provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): Promise<vscode.CodeLens[]> {
    this.log.trace("Providing code lenses", document.fileName);
    try {
      const codeLenses: vscode.CodeLens[] = [];
      const ast = await getAst(document);
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
      return [];
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
    const crawlerInfo = CRAWLER_LOOKUP[userAgentKey];
    if (!crawlerInfo || crawlerInfo.isPlaceholder) {
      return undefined;
    }
    const codelens = new vscode.CodeLens(userAgentSpan.range, {
      title: `# ${crawlerInfo.description}`,
      command: INTERNAL_COMMAND_ID,
      arguments: [crawlerInfo],
    });
    return codelens;
  }
}
