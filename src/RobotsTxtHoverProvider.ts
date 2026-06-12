import * as vscode from "vscode";
import * as constants from "./data/constants";
import { DIRECTIVE_LOOKUP } from "./data/directiveInfo";
import { parseLine } from "./parser/lineParser";
import { getLogger } from "./utils/logger";

/** Provides hover information for `robots.txt` files. */
export class RobotsTxtHoverProvider implements vscode.HoverProvider {
  /** The logger instance. */
  private readonly log = getLogger();

  /**
   * Provides hover information for `robots.txt` files.
   * @param document The text document in which the command was invoked.
   * @param position The position at which the command was invoked.
   * @param _token A cancellation token.
   * @returns A `Hover` object containing the hover information, or `undefined` if no hover information is available.
   */
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    this.log.trace("Providing hover for document", document.fileName);
    try {
      const parsedLine = parseLine(document.lineAt(position.line));
      const directiveKey = parsedLine.name?.text.toLowerCase();

      if (directiveKey === undefined) {
        // empty line or comment-only line, just ignore
        return undefined;
      }

      const directive = DIRECTIVE_LOOKUP[directiveKey];
      if (!directive) {
        // unknown directive, just ignore
        return undefined;
      }

      // example (code block)
      const exampleParams = directive.params.map((p) => p.example).join(" ");
      const example = `${directive.name}: ${exampleParams}`;

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
      // reference
      if (directive.reference.length > 0) {
        md.appendMarkdown("**References:**\n\n");
        directive.reference.forEach((ref) => {
          md.appendMarkdown(`- [${escapeMarkdown(ref.text)}](${ref.url})\n`);
        });
        md.appendMarkdown("\n");
      }
      return new vscode.Hover(md);
    } catch (error) {
      this.log.error("Error providing hover for document", error);
      return undefined;
    } finally {
      this.log.trace("Finished providing hover for document");
    }
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
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("<", "\\<")
    .replaceAll(">", "\\>");
}
