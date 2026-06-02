import * as vscode from "vscode";
import { CRAWLER_INFOS } from "./data/crawlerInfo";
import { DIRECTIVE_INFOS } from "./data/directiveInfo";
import { parseLine } from "./parser/lineParser";

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
    const lineText = document.lineAt(position.line);
    const { name, separator, value, comment } = parseLine(lineText);

    const namePart = name.text.toLowerCase();

    // If the line is empty or only contains whitespace, suggest all directives
    if (
      name.range.contains(position) ||
      (name.text.length === 0 && comment === undefined)
    ) {
      const inputLength = position.character - name.range.start.character;
      const inputPart = namePart.substring(0, inputLength);
      const endPosition = value
        ? value.range.start
        : separator
          ? separator.range.end
          : name.range.end;
      const range = new vscode.Range(name.range.start, endPosition);
      let result: vscode.CompletionItem[] = [];
      for (const [key, info] of Object.entries(DIRECTIVE_INFOS)) {
        if (info.hiddenCompletion || !key.startsWith(inputPart)) {
          continue;
        }
        result.push(newCompletionKeyword(`${info.name}: `, range));
      }
      return result;
    }

    // Suggest common user agents
    if (namePart === "user-agent" && value && value.range.contains(position)) {
      const valuePart = value.text.toLowerCase();
      const inputLength = position.character - value.range.start.character;
      const inputPart = valuePart.substring(0, inputLength);
      let result: vscode.CompletionItem[] = [];
      for (const [key, info] of Object.entries(CRAWLER_INFOS)) {
        if (
          key === valuePart ||
          !key.startsWith(inputPart) ||
          info.hiddenCompletion ||
          (info.prefix && !valuePart.startsWith(info.prefix))
        ) {
          continue;
        }
        result.push(newCompletionValue(info.name, value.range));
      }
      return result;
    }

    // Suggest common paths for Disallow and Allow directives
    // if (namePart === "disallow" || namePart === "allow") {
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

/** Creates a new completion item for a keyword */
function newCompletionKeyword(
  label: string,
  range: vscode.Range,
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(
    label,
    vscode.CompletionItemKind.Keyword,
  );
  item.range = range;
  return item;
}

/** Creates a new completion item for a value */
function newCompletionValue(
  label: string,
  range: vscode.Range,
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(
    label,
    vscode.CompletionItemKind.Value,
  );
  item.range = range;
  return item;
}
