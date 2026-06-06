import * as vscode from "vscode";
import { formatLine } from "./RobotsTxtFormatter";
import { parseLine } from "./parser/lineParser";
import { getLogger } from "./utils/logger";

export class RobotsTxtOnTypeFormattingEditProvider
  implements vscode.OnTypeFormattingEditProvider
{
  /** The logger instance. */
  private readonly log = getLogger();

  /**
   * Provides formatting edits after a specific character is typed.
   * @param document The document to format.
   * @param position The position at which the character was typed.
   * @param trigger The character that was typed.
   * @param _options The formatting options.
   * @param _token A cancellation token.
   * @returns An array of text edits to apply to the document after the specified character is typed.
   */
  public provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    trigger: string,
    _options: vscode.FormattingOptions,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    this.log.trace(
      "Providing on-type formatting edits",
      document.fileName,
      position.line,
    );
    try {
      if (trigger !== "\n") {
        // Only trigger on newline character
        return [];
      }
      if (position.line === 0) {
        // No previous line to format
        return [];
      }
      const lineText = document.lineAt(position.line - 1);
      const parsedLine = parseLine(lineText);
      const formattedLine = formatLine(parsedLine);
      if (formattedLine !== lineText.text) {
        return [vscode.TextEdit.replace(lineText.range, formattedLine)];
      }
      return [];
    } catch (error) {
      this.log.error("Error providing on-type formatting edits", error);
      return [];
    } finally {
      this.log.trace("Finished providing on-type formatting edits");
    }
  }
}
