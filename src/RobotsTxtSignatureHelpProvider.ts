import * as vscode from "vscode";
import { parseLine, splitTokenBySpace, Token } from "./lineParser";
import { DIRECTIVE_INFOS, DirectiveInfo } from "./directiveInfo";

export class RobotsTxtSignatureHelpProvider
  implements vscode.SignatureHelpProvider
{
  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext,
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    const parsedLine = parseLine(document.lineAt(position.line));

    const directiveType = parsedLine.nameToken?.text.toLowerCase();
    if (!directiveType) {
      // empty line or comment-only line, just ignore
      return undefined;
    }

    const directiveInfo = DIRECTIVE_INFOS[directiveType];
    if (!directiveInfo) {
      // unknown directive, just ignore
      return undefined;
    }

    // create parameter information for signature help
    const parameters = directiveInfo.params.map(
      (param) =>
        new vscode.ParameterInformation(param.label, param.documentation),
    );

    // decide active parameter
    const activeParameter = decideActiveParameter(
      directiveInfo,
      parsedLine.valueToken,
      position,
    );

    // create signature information
    const signature = new vscode.SignatureInformation(
      directiveInfo.usage,
      directiveInfo.description,
    );
    signature.parameters = parameters;

    // create signature help and set active parameter
    const help = new vscode.SignatureHelp();
    help.signatures = [signature];
    help.activeSignature = 0;
    help.activeParameter = activeParameter;
    return help;
  }
}

/**
 * Decides which parameter is active based on the cursor position.
 * @param directiveInfo The directive information containing the parameters.
 * @param valueToken The token representing the directive value, which may contain multiple parameters separated by spaces.
 * @param cursorPosition The current position of the cursor in the document.
 * @returns The index of the active parameter.
 */
function decideActiveParameter(
  directiveInfo: DirectiveInfo,
  valueToken: Token | undefined,
  cursorPosition: vscode.Position,
): number {
  if (directiveInfo.params.length <= 1) {
    return 0;
  }

  if (!valueToken) {
    return 0;
  }

  const tokens = splitTokenBySpace(valueToken);
  const activeParamIndex = directiveInfo.params.findIndex(
    (_, index) =>
      tokens.length <= index || tokens[index]?.range.contains(cursorPosition),
  );

  return activeParamIndex === -1
    ? directiveInfo.params.length - 1
    : activeParamIndex;
}
