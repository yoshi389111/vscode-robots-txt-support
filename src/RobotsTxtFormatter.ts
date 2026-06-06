import * as vscode from "vscode";
import { parseLine, ParsedLine, splitTokens } from "./parser/lineParser";
import { Span, isEmptySpan } from "./parser/span";
import { DIRECTIVE_LOOKUP } from "./data/directiveInfo";
import { CRAWLER_LOOKUP } from "./data/crawlerInfo";

type State = "empty" | "comment" | "global" | "in-user-agent" | "user-agent";

export function formatRange(
  document: vscode.TextDocument,
  range: vscode.Range,
): vscode.TextEdit[] {
  const result: vscode.TextEdit[] = [];

  if (0 < document.lineCount && range.end.line >= document.lineCount - 1) {
    const lastLine = document.lineAt(document.lineCount - 1);
    if (
      lastLine.range.isEqual(lastLine.rangeIncludingLineBreak) &&
      lastLine.text.length !== 0
    ) {
      const eol = document.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
      result.push(vscode.TextEdit.insert(lastLine.range.end, eol));
    }
  }

  let state: State = "empty";
  let pendingData: { emptyLine: vscode.TextLine; state: State } | null = null;
  for (let lineNo = range.end.line; lineNo >= range.start.line; lineNo--) {
    const lineText = document.lineAt(lineNo);
    const parsedLine = parseLine(lineText);
    const nextState: State = determineState(parsedLine);

    if (state === "empty") {
      if (nextState === "empty") {
        result.push(deleteLine(lineText));
        continue;
      } else if (
        nextState === "global" ||
        nextState === "in-user-agent" ||
        nextState === "user-agent"
      ) {
        if (pendingData) {
          if (pendingData.state === nextState) {
            result.push(deleteLine(pendingData.emptyLine));
          } else if (pendingData.emptyLine.text.length !== 0) {
            result.push(toEmptyLineEdit(pendingData.emptyLine));
          }
          pendingData = null;
        }
      }
      state = nextState;
    } else if (state === "comment") {
      if (nextState === "empty") {
        if (pendingData && pendingData.emptyLine.text.length !== 0) {
          result.push(toEmptyLineEdit(pendingData.emptyLine));
          pendingData = null;
        }
      } else if (
        nextState === "global" ||
        nextState === "in-user-agent" ||
        nextState === "user-agent"
      ) {
        if (pendingData) {
          if (pendingData.state === nextState) {
            result.push(deleteLine(pendingData.emptyLine));
          } else if (pendingData.emptyLine.text.length !== 0) {
            result.push(toEmptyLineEdit(pendingData.emptyLine));
          }
          pendingData = null;
        }
      }
      state = nextState;
    } else if (state === "in-user-agent") {
      if (nextState === "empty") {
        result.push(deleteLine(lineText));
        continue;
      } else if (nextState === "global") {
        result.push(insertEmptyLine(lineNo + 1));
        state = nextState;
      } else if (nextState === "user-agent") {
        state = nextState;
      }
    } else if (state === "global") {
      if (nextState === "empty") {
        pendingData = { emptyLine: lineText, state: state };
        state = nextState;
        continue;
      } else if (nextState === "in-user-agent" || nextState === "user-agent") {
        result.push(insertEmptyLine(lineNo + 1));
        state = nextState;
      }
    } else if (state === "user-agent") {
      if (nextState === "empty") {
        pendingData = { emptyLine: lineText, state: state };
        state = nextState;
        continue;
      } else if (nextState === "in-user-agent" || nextState === "global") {
        result.push(insertEmptyLine(lineNo + 1));
        state = nextState;
      }
    }

    const formattedLine = formatLine(parsedLine);
    if (formattedLine !== lineText.text) {
      result.push(vscode.TextEdit.replace(lineText.range, formattedLine));
    }
  }
  if (pendingData && pendingData.emptyLine.text.length !== 0) {
    result.push(toEmptyLineEdit(pendingData.emptyLine));
  }

  result.sort((a, b) => b.range.start.line - a.range.start.line);
  return result;
}

export function formatLine(parsedLine: ParsedLine): string {
  const { name, separator, value, comment } = parsedLine;

  const params: Span[] = [];
  if (value && !isEmptySpan(value)) {
    let remainder = value;
    while (remainder) {
      const tokens = splitTokens(remainder, /\s+/);
      params.push(tokens[0]);
      if (tokens.length === 1) {
        break;
      }
      remainder = tokens[2];
    }
  }

  const nameText = canonicalizeDirectiveName(name.text);
  const separatorText = separator ? ": " : "";
  const paramsText =
    nameText === "User-agent" && params.length === 1 && params[0]
      ? canonicalizeProductToken(params[0].text)
      : params.map((param) => param.text).join(" ");
  const commentText = comment ? comment.text : "";
  return `${nameText}${separatorText}${paramsText} ${commentText}`.trim();
}

function canonicalizeDirectiveName(directiveName: string): string {
  const directiveKey = directiveName.toLowerCase();
  const directiveInfo = DIRECTIVE_LOOKUP[directiveKey];
  if (!directiveInfo) {
    return directiveName;
  }
  return directiveInfo.name;
}

function canonicalizeProductToken(productToken: string): string {
  const tokenKey = productToken.toLowerCase();
  const crawlerInfo = CRAWLER_LOOKUP[tokenKey];
  if (!crawlerInfo) {
    return productToken;
  }
  return crawlerInfo.name;
}

function determineState(parsedLine: ParsedLine): State {
  if (isEmptySpan(parsedLine.name) && parsedLine.separator === undefined) {
    return parsedLine.comment ? "comment" : "empty";
  }

  const directiveName = parsedLine.name.text.toLowerCase();
  if (directiveName === "user-agent") {
    return "user-agent";
  }

  const directiveInfo = DIRECTIVE_LOOKUP[directiveName];
  if (directiveInfo && directiveInfo.scope === "global") {
    return "global";
  }
  return "in-user-agent";
}

function toEmptyLineEdit(lineText: vscode.TextLine): vscode.TextEdit {
  return vscode.TextEdit.replace(lineText.range, "");
}

function deleteLine(lineText: vscode.TextLine): vscode.TextEdit {
  return vscode.TextEdit.delete(lineText.rangeIncludingLineBreak);
}

function insertEmptyLine(lineNo: number): vscode.TextEdit {
  const position = new vscode.Position(lineNo, 0);
  return vscode.TextEdit.insert(position, "\n");
}
