import * as vscode from "vscode";

/** A span of text in the document. */
export interface Span {
  readonly text: string;
  readonly range: vscode.Range;
}

/**
 * Trims leading and trailing whitespace from a span's text.
 * @param span The span to trim.
 * @returns A new span with trimmed text.
 */
export function trimSpan(span: Span): Span {
  const text = span.text.trim();
  const offset = span.text.indexOf(text);
  const start = span.range.start.translate(0, offset);
  const end = start.translate(0, text.length);
  const range = new vscode.Range(start, end);
  return { text, range };
}

/**
 * Extracts a subspan from a given span based on specified start and end offsets.
 * @param span The original span from which to extract the subspan.
 * @param startOffset The start offset within the span's text.
 * @param endOffset The end offset within the span's text.
 * @returns A new span representing the extracted portion of the original span.
 */
export function subspan(
  span: Span,
  startOffset: number,
  endOffset: number,
): Span {
  const text = span.text.substring(startOffset, endOffset);
  const start = span.range.start.translate(0, startOffset);
  const end = span.range.start.translate(0, endOffset);
  const range = new vscode.Range(start, end);
  return { text, range };
}

/**
 * Checks if a given span is empty (i.e., has no text).
 * @param span The span to check.
 * @returns True if the span is empty, false otherwise.
 */
export function isEmptySpan(span: Span): boolean {
  return span.text.length === 0;
}
