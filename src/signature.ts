import * as vscode from "vscode";
import { parseLine } from "./lineparser";
import { DIRECTIVE_INFOS } from "./directiveInfo";

export class RobotsTxtSignatureHelpProvider
  implements vscode.SignatureHelpProvider
{
  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext,
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    const lineText = document.lineAt(position.line);
    const parsedLine = parseLine(lineText);
    const directiveName = parsedLine.name?.text.toLowerCase() ?? "";

    const directiveInfo = DIRECTIVE_INFOS[directiveName];
    if (!directiveInfo) {
      return undefined;
    }

    const signature = new vscode.SignatureInformation(
      directiveInfo.usage,
      directiveInfo.description,
    );

    signature.parameters = directiveInfo.params.map(
      (param) =>
        new vscode.ParameterInformation(param.label, param.documentation),
    );
    const help = new vscode.SignatureHelp();
    help.signatures = [signature];
    help.activeSignature = 0;

    if (1 < directiveInfo.params.length) {
      const params = lineText.text
        .substring(0, position.character)
        .replace(/^[^#:]*:/, "")
        .trimStart()
        .split(/\s+/);
      help.activeParameter = Math.min(
        params.length - 1,
        directiveInfo.params.length - 1,
      );
    } else {
      help.activeParameter = 0;
    }

    return help;
  }
}
