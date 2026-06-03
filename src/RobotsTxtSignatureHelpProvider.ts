import * as vscode from "vscode";
import { parseLine, splitTokenWithLimit } from "./parser/lineParser";
import { Span } from "./parser/span";
import { DIRECTIVE_INFOS, DirectiveInfo } from "./data/directiveInfo";
import { getLogger } from "./utils/logger";

/**
 * Provides signature help for `robots.txt` directives, showing usage and parameter information as the user types.
 */
export class RobotsTxtSignatureHelpProvider
  implements vscode.SignatureHelpProvider
{
  private readonly log = getLogger();

  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext,
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    this.log.trace("Providing signature help for document", document.fileName);
    try {
      const { name, value } = parseLine(document.lineAt(position.line));

      const directiveType = name.text.toLowerCase();
      const directiveInfo = DIRECTIVE_INFOS[directiveType];
      if (!directiveInfo) {
        // unknown directive, just ignore
        return undefined;
      }

      // create parameter information for signature help
      const parameters = directiveInfo.params.map(
        (param) =>
          new vscode.ParameterInformation(param.label, param.description),
      );

      // decide active parameter
      const activeParameter = decideActiveParameter(
        directiveInfo,
        value,
        position,
      );

      const usageParams = directiveInfo.params.map((p) => p.label).join(" ");
      const usage = `${directiveInfo.name}: ${usageParams}`;

      // create signature information
      const signature = new vscode.SignatureInformation(
        usage,
        directiveInfo.description,
      );
      signature.parameters = parameters;

      // create signature help and set active parameter
      const help = new vscode.SignatureHelp();
      help.signatures = [signature];
      help.activeSignature = 0;
      help.activeParameter = activeParameter;
      return help;
    } catch (error) {
      this.log.error("Error providing signature help for document", error);
      return undefined;
    } finally {
      this.log.trace("Finished providing signature help for document");
    }
  }
}

/**
 * Decides which parameter is active based on the cursor position.
 * @param directiveInfo The directive information containing the parameters.
 * @param valueSpan The span representing the directive value, which may contain multiple parameters separated by spaces.
 * @param cursorPosition The current position of the cursor in the document.
 * @returns The index of the active parameter.
 */
function decideActiveParameter(
  directiveInfo: DirectiveInfo,
  valueSpan: Span | undefined,
  cursorPosition: vscode.Position,
): number {
  if (directiveInfo.params.length <= 1) {
    return 0;
  }

  if (!valueSpan) {
    return 0;
  }

  const tokens = splitTokenWithLimit(valueSpan, directiveInfo.params.length);
  const activeParamIndex = directiveInfo.params.findIndex(
    (_, index) =>
      tokens.length <= index || tokens[index]?.range.contains(cursorPosition),
  );

  return activeParamIndex === -1
    ? directiveInfo.params.length - 1
    : activeParamIndex;
}
