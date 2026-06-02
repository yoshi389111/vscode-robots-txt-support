import * as vscode from "vscode";

export interface Token {
  text: string;
  range: vscode.Range;
}

export interface ParsedLine {
  name: Token;
  separator: Token | undefined;
  value: Token | undefined;
  comment: Token | undefined;
}

/**
 * Parses a line of the robots.txt file and extracts the directive, value, and comment.
 * @param line The line of the robots.txt file to parse.
 * @returns An object containing the parsed directive, value, and comment.
 */
export function parseLine(line: vscode.TextLine): ParsedLine {
  const [content, comment] = splitContentAndComment(line);
  const tokens = splitToken(content, /:/);
  return {
    name: tokens[0],
    separator: tokens[1],
    value: tokens[2],
    comment,
  };
}

/**
 * Splits a line into content and comment parts based on the presence of a '#' character.
 * @param line The line of text to split.
 * @returns A tuple containing the content token and an optional comment token.
 */
function splitContentAndComment(line: vscode.TextLine): [Token, Token?] {
  const { text, range } = line;
  const offset = text.indexOf("#");
  if (offset < 0) {
    return [{ text, range }];
  }

  const splitPosition = range.start.translate(0, offset);

  const contentPart = text.substring(0, offset);
  const contentRange = new vscode.Range(range.start, splitPosition);
  const contentToken: Token = { text: contentPart, range: contentRange };

  const commentPart = text.substring(offset);
  const commentRange = new vscode.Range(splitPosition, range.end);
  const commentToken: Token = { text: commentPart, range: commentRange };

  return [trimToken(contentToken), trimToken(commentToken)];
}

/**
 * Splits a token into parts based on a specified separator regex, with an optional limit on the number of parts.
 * @param token The token to split.
 * @param sepRegex The regular expression to use as the separator for splitting the token.
 * @returns An array of tokens resulting from the split operation, with leading and trailing whitespace removed.
 */
function splitToken(
  token: Token,
  sepRegex: RegExp,
): [Token] | [Token, Token, Token] {
  const match = token.text.match(sepRegex);
  if (!match) {
    return [trimToken(token)];
  }
  const separatorLength = match[0].length;
  const separatorOffset = match.index!;
  const valueOffset = separatorOffset + separatorLength;

  const separatorPosition = token.range.start.translate(0, separatorOffset);
  const valuePosition = separatorPosition.translate(0, separatorLength);

  const name = {
    text: token.text.substring(0, separatorOffset),
    range: new vscode.Range(token.range.start, separatorPosition),
  };
  const separator = {
    text: token.text.substring(separatorOffset, valueOffset),
    range: new vscode.Range(separatorPosition, valuePosition),
  };
  const value = {
    text: token.text.substring(valueOffset),
    range: new vscode.Range(valuePosition, token.range.end),
  };
  return [trimToken(name), separator, trimToken(value)];
}

/**
 * Trims leading and trailing whitespace from a token's text and adjusts its range accordingly.
 * @param token The token to trim.
 * @returns A new token with trimmed text and an updated range that reflects the trimmed content.
 */
function trimToken(token: Token): Token {
  const text = token.text.trim();
  const offset = token.text.indexOf(text);
  const start = token.range.start.translate(0, offset);
  const end = start.translate(0, text.length);
  const range = new vscode.Range(start, end);
  return { text, range };
}

/**
 * Splits a token into multiple parts based on a specified separator string, with an optional limit on the number of parts.
 * This function is designed to handle cases where a directive may have multiple parameters separated by spaces.
 * @param value The token to split, which may contain multiple parameters.
 * @param maxParts The maximum number of parts to split into. If the token contains more parts than this limit, the remaining text will be included in the last part.
 * @returns An array of tokens resulting from the split operation, with leading and trailing whitespace removed from each part.
 */
export function splitTokenWithLimit(value: Token, maxParts: number): Token[] {
  if (value.text.length === 0) {
    return [];
  }

  const parts: Token[] = [];
  let remainingToken = value;
  for (let i = 0; i < maxParts - 1; i++) {
    const divided = splitToken(remainingToken, /\s+/);
    parts.push(divided[0]);
    if (divided.length === 1) {
      return parts;
    }
    remainingToken = divided[2];
  }

  if (0 < remainingToken.text.length) {
    parts.push(remainingToken);
  }
  return parts;
}
