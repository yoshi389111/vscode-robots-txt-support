import * as vscode from "vscode";
import { parseLine, ParsedLine, splitTokens } from "./parser/lineParser";
import { Span, isEmptySpan } from "./parser/span";
import { DIRECTIVE_LOOKUP } from "./data/directiveInfo";
import { CRAWLER_LOOKUP } from "./data/crawlerInfo";

type State = "empty" | "comment" | "global" | "in-user-agent" | "user-agent";

/**
 * Format the given range in the document according to the following rules:
 * @param document The document to format.
 * @param range The range to format.
 * @returns An array of TextEdits to apply to the document.
 */
export function formatRange(
  document: vscode.TextDocument,
  range: vscode.Range,
): vscode.TextEdit[] {
  const edits = new TextEditList();

  if (0 < document.lineCount && document.lineCount - 1 <= range.end.line) {
    const lastLine = document.lineAt(document.lineCount - 1);
    if (
      lastLine.range.isEqual(lastLine.rangeIncludingLineBreak) &&
      lastLine.text.length !== 0
    ) {
      // If the last line does not end with an EOL, add an EOL.
      const eol = document.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
      edits.add(vscode.TextEdit.insert(lastLine.range.end, eol));
    }
  }

  // Check from the end line to the start line,
  // because comments before a directive are considered as the description of the directive.
  let state: State = "empty";
  let pendingData: { emptyLine: vscode.TextLine; state: State } | null = null;
  for (let lineNo = range.end.line; lineNo >= range.start.line; lineNo--) {
    const lineText = document.lineAt(lineNo);
    const parsedLine = parseLine(lineText);
    const nextState = determineState(parsedLine);

    if (state === "empty") {
      if (nextState === "empty") {
        // Delete consecutive empty lines.
        edits.deleteLine(lineText);
        continue;
      } else if (nextState === "comment") {
        state = nextState;
      } else if (
        nextState === "global" ||
        nextState === "in-user-agent" ||
        nextState === "user-agent"
      ) {
        if (pendingData) {
          if (pendingData.state === nextState) {
            edits.deleteLine(pendingData.emptyLine);
          } else {
            edits.truncateLine(pendingData.emptyLine);
          }
          pendingData = null;
        }
        state = nextState;
      }
    } else if (state === "comment") {
      if (nextState === "empty") {
        if (pendingData) {
          edits.truncateLine(pendingData.emptyLine);
          pendingData = null;
        }
        state = nextState;
      } else if (nextState === "comment") {
        // No state change.
      } else if (
        nextState === "global" ||
        nextState === "in-user-agent" ||
        nextState === "user-agent"
      ) {
        if (pendingData) {
          if (pendingData.state === nextState) {
            edits.deleteLine(pendingData.emptyLine);
          } else {
            edits.truncateLine(pendingData.emptyLine);
          }
          pendingData = null;
        }
        state = nextState;
      }
    } else if (state === "in-user-agent") {
      if (nextState === "empty") {
        edits.deleteLine(lineText);
        continue;
      } else if (nextState === "comment") {
        // No state change.
      } else if (nextState === "global") {
        edits.insertEmptyLine(document, lineNo + 1);
        state = nextState;
      } else if (nextState === "user-agent") {
        state = nextState;
      }
    } else if (state === "global") {
      if (nextState === "empty") {
        pendingData = { emptyLine: lineText, state };
        state = nextState;
        continue;
      } else if (nextState === "comment") {
        // No state change.
      } else if (nextState === "in-user-agent" || nextState === "user-agent") {
        edits.insertEmptyLine(document, lineNo + 1);
        state = nextState;
      }
    } else if (state === "user-agent") {
      if (nextState === "empty") {
        pendingData = { emptyLine: lineText, state };
        state = nextState;
        continue;
      } else if (nextState === "comment") {
        // No state change.
      } else if (nextState === "in-user-agent" || nextState === "global") {
        edits.insertEmptyLine(document, lineNo + 1);
        state = nextState;
      }
    }

    const formattedLine = formatLine(parsedLine);
    if (formattedLine !== lineText.text) {
      edits.add(vscode.TextEdit.replace(lineText.range, formattedLine));
    }
  }
  if (pendingData) {
    edits.truncateLine(pendingData.emptyLine);
  }

  edits.sort();
  return edits.getEdits();
}

/**
 * A helper class to manage TextEdits.
 */
class TextEditList {
  /** The list of TextEdits. */
  private edits: vscode.TextEdit[] = [];

  /**
   * Add a TextEdit to the list.
   * @param edit The TextEdit to add.
   */
  add(edit: vscode.TextEdit): void {
    this.edits.push(edit);
  }

  /**
   * Delete the line of the given TextLine.
   * @param lineText The TextLine to delete.
   */
  deleteLine(lineText: vscode.TextLine): void {
    this.edits.push(vscode.TextEdit.delete(lineText.rangeIncludingLineBreak));
  }

  /**
   * Truncate the line of the given TextLine.
   * @param lineText The TextLine to truncate.
   */
  truncateLine(lineText: vscode.TextLine): void {
    if (lineText.text.length !== 0) {
      this.edits.push(vscode.TextEdit.delete(lineText.range));
    }
  }

  /**
   * Insert an empty line at the given line number.
   * @param document The document to insert the empty line.
   * @param lineNo The line number to insert the empty line.
   */
  insertEmptyLine(document: vscode.TextDocument, lineNo: number): void {
    const position = new vscode.Position(lineNo, 0);
    const eol = document.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    this.edits.push(vscode.TextEdit.insert(position, eol));
  }

  /**
   * Sort the TextEdits by their position in the document.
   */
  sort(): void {
    this.edits.sort((a, b) => {
      if (a.range.start.line !== b.range.start.line) {
        return a.range.start.line - b.range.start.line;
      }
      if (a.range.start.character !== b.range.start.character) {
        return a.range.start.character - b.range.start.character;
      }
      if (a.range.end.line !== b.range.end.line) {
        return b.range.end.line - a.range.end.line;
      }
      return b.range.end.character - a.range.end.character;
    });
  }

  /**
   * Get the list of TextEdits.
   * @returns The list of TextEdits.
   */
  getEdits(): vscode.TextEdit[] {
    return this.edits;
  }
}

/**
 * Format a parsed line according to the following rules:
 * @param parsedLine The parsed line to format.
 * @returns The formatted line.
 */
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

/**
 * Canonicalize the directive name
 * @param directiveName The directive name to canonicalize.
 * @returns The canonicalized directive name.
 */
function canonicalizeDirectiveName(directiveName: string): string {
  const directiveKey = directiveName.toLowerCase();
  const directiveInfo = DIRECTIVE_LOOKUP[directiveKey];
  if (!directiveInfo) {
    return directiveName;
  }
  return directiveInfo.name;
}

/**
 * Canonicalize the product token
 * @param productToken The product token to canonicalize.
 * @returns The canonicalized product token.
 */
function canonicalizeProductToken(productToken: string): string {
  const tokenKey = productToken.toLowerCase();
  const crawlerInfo = CRAWLER_LOOKUP[tokenKey];
  if (!crawlerInfo) {
    return productToken;
  }
  return crawlerInfo.name;
}

/**
 * Determine the state of the line based on the parsed line.
 * @param parsedLine The parsed line to determine the state.
 * @returns The state of the line.
 */
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
