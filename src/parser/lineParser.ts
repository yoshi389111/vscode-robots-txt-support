import * as vscode from "vscode";
import { Span, trimSpan, subspan, isEmptySpan } from "./span";

/** Represents a parsed line of the robots.txt file */
export interface ParsedLine {
  readonly name: Span;
  readonly separator: Span | undefined;
  readonly value: Span | undefined;
  readonly comment: Span | undefined;
}

/**
 * Parses a line of the robots.txt file.
 * @param lineText The line to parse.
 * @returns An object containing the parsed directive, separator, value, and comment.
 */
export function parseLine(lineText: vscode.TextLine): ParsedLine {
  const [content, comment] = splitComment(lineText);
  const tokens = splitTokens(content, /:/);
  return {
    name: tokens[0],
    separator: tokens[1],
    value: tokens[2],
    comment,
  };
}

/**
 * Splits a line into content and comment parts.
 * @param lineText The line of text to split.
 * @returns A tuple containing the content span and an optional comment span.
 */
function splitComment(lineText: vscode.TextLine): [Span, Span?] {
  const span: Span = { text: lineText.text, range: lineText.range };
  const offset = span.text.indexOf("#");
  if (offset < 0) {
    return [trimSpan(span)];
  }

  const contentSpan = subspan(span, 0, offset);
  const commentSpan = subspan(span, offset, span.text.length);
  return [trimSpan(contentSpan), commentSpan];
}

/**
 * Splits a content into parts based on a specified separator regex.
 * @param content The content to split.
 * @param separatorRegex The regular expression to use as the separator for splitting the content.
 * @returns An array of spans resulting from the split operation.
 */
export function splitTokens(
  content: Span,
  separatorRegex: RegExp,
): [Span] | [Span, Span, Span] {
  const match = content.text.match(separatorRegex);
  if (!match) {
    return [content];
  }

  const separatorOffset = match.index!;
  const valueOffset = separatorOffset + match[0].length;

  const name = subspan(content, 0, separatorOffset);
  const separator = subspan(content, separatorOffset, valueOffset);
  const value = subspan(content, valueOffset, content.text.length);
  return [trimSpan(name), separator, trimSpan(value)];
}

/**
 * Splits a span into multiple parts, with a limit on the number of parts.
 * If the span contains more parts than this limit, the remaining text will be included in the last part.
 * @param value The span to split.
 * @param maxParts The maximum number of parts to split into.
 * @returns An array of spans resulting from the split operation.
 */
export function splitTokenWithLimit(value: Span, maxParts: number): Span[] {
  if (isEmptySpan(value)) {
    return [];
  }

  const parts: Span[] = [];
  let remainingSpan = value;
  for (let i = 0; i < maxParts - 1; i++) {
    const divided = splitTokens(remainingSpan, /\s+/);
    parts.push(divided[0]);
    if (divided[2]) {
      remainingSpan = divided[2];
    } else {
      return parts;
    }
  }

  if (!isEmptySpan(remainingSpan)) {
    parts.push(remainingSpan);
  }
  return parts;
}
