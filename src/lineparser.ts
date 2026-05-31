import * as vscode from "vscode";

export interface Token {
  text: string;
  range: vscode.Range;
}

export interface ParsedLine {
  name?: Token;
  value?: Token;
  comment?: Token;
}

/**
 * Parses a line of the robots.txt file and extracts the directive, value, and comment.
 * @param line The line of the robots.txt file to parse.
 * @returns An object containing the parsed directive, value, and comment.
 */
export function parseLine(line: vscode.TextLine): ParsedLine {
  const lineText = line.text;
  const lineNo = line.lineNumber;
  const result: ParsedLine = {};

  // comment
  const commentStart = lineText.indexOf("#");
  const hasComment = commentStart >= 0;
  if (hasComment) {
    const commentEnd = lineText.length;
    const text = lineText.substring(commentStart + 1);
    const range = new vscode.Range(lineNo, commentStart, lineNo, commentEnd);
    result.comment = { text, range };
  }

  const content = hasComment ? lineText.substring(0, commentStart) : lineText;
  if (content.trim().length === 0) {
    // empty line
    return result;
  }

  // directive name
  const nameStart = content.search(/\S/);
  const colonPos = content.indexOf(":");
  if (colonPos < 0) {
    // no colon, treat the whole line as directive (invalid but we can report diagnostics later)
    const text = content.trim().toLowerCase();
    const nameEnd = nameStart + text.length;
    const range = new vscode.Range(lineNo, nameStart, lineNo, nameEnd);
    result.name = { text, range };
    return result;
  } else {
    const text = content.substring(0, colonPos).trim();
    const nameEnd = nameStart + text.length;
    const range = new vscode.Range(lineNo, nameStart, lineNo, nameEnd);
    result.name = { text, range };
  }

  // directive value
  const valuePart = content.substring(colonPos + 1);
  const valueOffset = valuePart.search(/\S/);
  if (valueOffset >= 0) {
    const text = valuePart.trim();
    const valueStart = colonPos + 1 + valueOffset;
    const valueEnd = valueStart + text.length;
    const range = new vscode.Range(lineNo, valueStart, lineNo, valueEnd);
    result.value = { text, range };
  } else {
    const valueStart = colonPos + 1;
    const range = new vscode.Range(lineNo, valueStart, lineNo, valueStart);
    result.value = { text: "", range };
  }

  return result;
}
