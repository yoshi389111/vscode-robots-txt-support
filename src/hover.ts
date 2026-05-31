import * as vscode from "vscode";
import { parseLine } from "./lineparser";
import * as constants from "./constants";
import { DIRECTIVE_INFOS } from "./directiveInfo";

export class RobotsTxtHoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    const parsedLine = parseLine(document.lineAt(position.line));
    const directiveName = parsedLine.name?.text.toLowerCase();

    if (directiveName === undefined) {
      // empty line or comment-only line, just ignore
      return null;
    }

    const directive = DIRECTIVE_INFOS[directiveName];
    if (!directive) {
      // unknown directive, just ignore
      return null;
    }

    const md = new vscode.MarkdownString();
    md.appendCodeblock(directive.example, constants.LANGUAGE_ID);
    md.appendMarkdown(`${escapeMarkdown(directive.description)}\n\n`);
    if (directive.details.length > 0) {
      md.appendMarkdown(directive.details.map(escapeMarkdown).join("  \n"));
      md.appendMarkdown("\n\n");
    }
    if (directive.reference) {
      md.appendMarkdown("**References:**\n\n");
      directive.reference.forEach((ref) => {
        md.appendMarkdown(`- [${escapeMarkdown(ref.text)}](${ref.url})\n`);
      });
      md.appendMarkdown("\n");
    }
    md.appendMarkdown("**Parameters:**\n\n");
    for (const param of directive.params) {
      md.appendMarkdown(
        `- \`${param.label}\` ― ${escapeMarkdown(param.documentation)}\n`,
      );
    }
    return new vscode.Hover(md);
  }
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
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("<", "\\<")
    .replaceAll(">", "\\>");
}
