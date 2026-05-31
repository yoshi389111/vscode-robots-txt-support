import * as vscode from "vscode";
import { CRAWLER_INFOS } from "./crawlerInfo";

/** List of common directives in robots.txt */
const DIRECTIVES = [
  "User-agent: ",
  "Disallow: ",
  "Allow: ",
  "Sitemap: ",
  "Crawl-delay: ",
  "Clean-param: ",
] as const;

/** Creates a new completion item for a keyword */
const newCompletionKeyword = (label: string): vscode.CompletionItem =>
  new vscode.CompletionItem(label, vscode.CompletionItemKind.Keyword);

/** Creates a new completion item for a value */
const newCompletionValue = (label: string): vscode.CompletionItem =>
  new vscode.CompletionItem(label, vscode.CompletionItemKind.Value);

/** Completion item provider for robots.txt */
export class RobotsTxtCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    // Get the text of the current line up to the cursor position
    const lineParts = document
      .lineAt(position)
      .text.substring(0, position.character)
      .split(":", 2)
      .map((part) => part.trim());

    const directivePart = lineParts[0]?.toLowerCase();
    const valuePart = lineParts[1];

    // If the line is empty or only contains whitespace, suggest all directives
    if (directivePart === undefined) {
      return DIRECTIVES.map(newCompletionKeyword);
    }

    if (valuePart === undefined) {
      // Suggest directives that match the current line prefix
      return DIRECTIVES.filter((directive) =>
        directive.toLowerCase().startsWith(directivePart),
      ).map(newCompletionKeyword);
    }

    // Suggest common user agents
    if (directivePart === "user-agent") {
      const userAgentPart = valuePart.toLowerCase();
      return Object.entries(CRAWLER_INFOS)
        .filter(([key, _]) => key.startsWith(userAgentPart))
        .map(([, info]) => info)
        .filter((info) => !info.hiddenCompletion)
        .filter(
          (info) =>
            info.prefix === undefined ||
            userAgentPart.startsWith(info.prefix.toLowerCase()),
        )
        .map((info) => newCompletionValue(info.name));
    }

    // Suggest common paths for Disallow and Allow directives
    if (directivePart === "disallow" || directivePart === "allow") {
      // TODO:
      return [
        newCompletionValue("/"),
        newCompletionValue("/private/"),
        newCompletionValue("/public/"),
      ];
    }

    // If no matching directive is found, return undefined
    return undefined;
  }
}
