import * as vscode from "vscode";
import { parseLine } from "./parser/lineParser";
import * as constants from "./data/constants";
import { DIRECTIVE_LOOKUP } from "./data/directiveInfo";
import { CRAWLER_LOOKUP, CrawlerInfo } from "./data/crawlerInfo";
import { getLogger } from "./utils/logger";

export class RobotsTxtHoverProvider implements vscode.HoverProvider {
  private readonly log = getLogger();

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    this.log.trace("Providing hover for document", document.fileName);
    try {
      const parsedLine = parseLine(document.lineAt(position.line));
      const directiveKey = parsedLine.name?.text.toLowerCase();
      const crawlerKey = parsedLine.value?.text.toLowerCase();

      if (directiveKey === undefined) {
        // empty line or comment-only line, just ignore
        return null;
      }

      const directive = DIRECTIVE_LOOKUP[directiveKey];
      if (!directive) {
        // unknown directive, just ignore
        return null;
      }

      const crawlerInfo =
        directiveKey === "user-agent" ? getCrawlerInfo(crawlerKey) : undefined;

      const exampleParams = directive.params.map((p) => p.example).join(" ");

      // example (code block)
      const example = crawlerInfo
        ? `User-agent: ${crawlerInfo.name}`
        : `${directive.name}: ${exampleParams}`;

      const md = new vscode.MarkdownString();
      md.appendCodeblock(example, constants.LANGUAGE_ID);

      // description
      md.appendMarkdown(`${escapeMarkdown(directive.description)}\n\n`);
      // details
      if (directive.details.length > 0) {
        md.appendMarkdown(directive.details.map(escapeMarkdown).join("  \n"));
        md.appendMarkdown("\n\n");
      }
      // parameters
      md.appendMarkdown("**Parameters:**\n\n");
      for (const param of directive.params) {
        md.appendMarkdown(
          `- \`${param.label}\` ― ${escapeMarkdown(param.description)}\n`,
        );
      }
      md.appendMarkdown("\n");
      // crawler
      if (crawlerInfo) {
        md.appendMarkdown("**Crawler:**\n\n");
        md.appendMarkdown(
          `- ${escapeMarkdown(crawlerInfo.name)} ― ${escapeMarkdown(crawlerInfo.description)}\n\n`,
        );
      }
      // reference
      if (directive.reference.length > 0 || crawlerInfo?.url) {
        md.appendMarkdown("**References:**\n\n");
        directive.reference.forEach((ref) => {
          md.appendMarkdown(`- [${escapeMarkdown(ref.text)}](${ref.url})\n`);
        });
        if (crawlerInfo?.url) {
          md.appendMarkdown(
            `- [${escapeMarkdown(crawlerInfo.name)}](${crawlerInfo.url})\n`,
          );
        }
        md.appendMarkdown("\n");
      }
      return new vscode.Hover(md);
    } catch (error) {
      this.log.error("Error providing hover for document", error);
      return null;
    } finally {
      this.log.trace("Finished providing hover for document");
    }
  }
}

function getCrawlerInfo(
  crawlerKey: string | undefined,
): CrawlerInfo | undefined {
  if (!crawlerKey) {
    return undefined;
  }

  const crawlerInfo = CRAWLER_LOOKUP[crawlerKey];
  if (!crawlerInfo || crawlerInfo.hiddenHover) {
    return undefined;
  }

  const baseCrawlerInfo = crawlerInfo.inheritsFromKey
    ? CRAWLER_LOOKUP[crawlerInfo.inheritsFromKey]
    : undefined;

  if (!baseCrawlerInfo) {
    return crawlerInfo;
  }

  // merge with base crawler info
  return {
    ...baseCrawlerInfo,
    ...crawlerInfo,
  };
}

/**
 * Escapes special characters in a string for use in Markdown content.
 * @param text The text to escape.
 * @returns The escaped text, safe for use in Markdown.
 */
function escapeMarkdown(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("<", "\\<")
    .replaceAll(">", "\\>");
}
