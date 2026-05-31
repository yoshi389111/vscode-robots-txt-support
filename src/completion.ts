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
const newCompletionKeyword = (
  label: string,
  range?: vscode.Range,
): vscode.CompletionItem => {
  const item = new vscode.CompletionItem(
    label,
    vscode.CompletionItemKind.Keyword,
  );
  if (range) {
    item.range = range;
  }
  return item;
};

/** Creates a new completion item for a value */
const newCompletionValue = (
  label: string,
  range?: vscode.Range,
): vscode.CompletionItem => {
  const item = new vscode.CompletionItem(
    label,
    vscode.CompletionItemKind.Value,
  );
  if (range) {
    item.range = range;
  }
  return item;
};

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
      .split(":", 2);

    const directivePart = lineParts[0]?.trimStart().toLowerCase();
    const valuePart = lineParts[1]?.trimEnd();

    // If the line is empty or only contains whitespace, suggest all directives
    if (directivePart === undefined) {
      return DIRECTIVES.map((directive) => newCompletionKeyword(directive));
    }

    if (valuePart === undefined) {
      // Suggest directives that match the current line prefix
      const range = new vscode.Range(
        position.translate(0, -directivePart.length),
        position,
      );
      return DIRECTIVES.filter((directive) =>
        directive.toLowerCase().startsWith(directivePart),
      ).map((directive) => newCompletionKeyword(directive, range));
    }

    // Suggest common user agents
    if (directivePart === "user-agent") {
      const inputPart = valuePart.toLowerCase();
      const range = new vscode.Range(
        position.translate(0, -inputPart.length),
        position,
      );
      return Object.entries(CRAWLER_INFOS)
        .filter(([key, _]) => key !== inputPart && key.startsWith(inputPart))
        .map(([, info]) => info)
        .filter((info) => !info.hiddenCompletion)
        .filter(
          (info) =>
            info.prefix === undefined || inputPart.startsWith(info.prefix),
        )
        .map((info) => newCompletionValue(info.name, range));
    }

    // // Suggest common paths for Disallow and Allow directives
    // if (directivePart === "disallow" || directivePart === "allow") {
    //   // TODO:
    //   return [
    //     newCompletionValue("/"),
    //     newCompletionValue("/private/"),
    //     newCompletionValue("/public/"),
    //   ];
    // }

    // If no matching directive is found, return undefined
    return undefined;
  }
}
