import * as vscode from "vscode";

export class RobotsTxtSignatureHelpProvider
  implements vscode.SignatureHelpProvider
{
  public provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext,
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    const line = document.lineAt(position.line).text;
    const beforeCursor = line.substring(0, position.character);

    if (/^\s*user-agent\s*(:\s*)/i.test(beforeCursor)) {
      const signature = new vscode.SignatureInformation(
        "User-agent: <agent-name>",
        "targets a specific crawler.",
      );

      signature.parameters = [
        new vscode.ParameterInformation(
          "<agent-name>",
          "The name of the crawler to target (e.g., Googlebot, Bingbot, etc.). Use * to target all crawlers.",
        ),
      ];
      const help = new vscode.SignatureHelp();
      help.signatures = [signature];
      help.activeSignature = 0;
      help.activeParameter = 0;
      return help;
    }

    if (/^\s*disallow\s*(:\s*)/i.test(beforeCursor)) {
      const signature = new vscode.SignatureInformation(
        "Disallow: <path>",
        "specifies a path that should not be crawled.",
      );

      signature.parameters = [
        new vscode.ParameterInformation(
          "<path>",
          "The path that should not be crawled (e.g., /private/). Use / to disallow crawling of the entire site.",
        ),
      ];
      const help = new vscode.SignatureHelp();
      help.signatures = [signature];
      help.activeSignature = 0;
      help.activeParameter = 0;
      return help;
    }

    if (/^\s*allow\s*(:\s*)/i.test(beforeCursor)) {
      const signature = new vscode.SignatureInformation(
        "Allow: <path>",
        "specifies a path that can be crawled.",
      );

      signature.parameters = [
        new vscode.ParameterInformation(
          "<path>",
          "The path that can be crawled (e.g., /public/). Use / to allow crawling of the entire site.",
        ),
      ];
      const help = new vscode.SignatureHelp();
      help.signatures = [signature];
      help.activeSignature = 0;
      help.activeParameter = 0;
      return help;
    }

    if (/^\s*sitemap\s*(:\s*)/i.test(beforeCursor)) {
      const signature = new vscode.SignatureInformation(
        "Sitemap: <url>",
        "specifies the location of a sitemap.",
      );

      signature.parameters = [
        new vscode.ParameterInformation(
          "<url>",
          "The absolute URL of the sitemap (e.g., https://www.example.com/sitemap.xml).",
        ),
      ];
      const help = new vscode.SignatureHelp();
      help.signatures = [signature];
      help.activeSignature = 0;
      help.activeParameter = 0;
      return help;
    }

    if (/^\s*host\s*(:\s*)/i.test(beforeCursor)) {
      const signature = new vscode.SignatureInformation(
        "Host: <domain>",
        "specifies the location of the canonical host.",
      );

      signature.parameters = [
        new vscode.ParameterInformation(
          "<domain>",
          "The domain of the host (e.g., www.example.com).",
        ),
      ];
      const help = new vscode.SignatureHelp();
      help.signatures = [signature];
      help.activeSignature = 0;
      help.activeParameter = 0;
      return help;
    }

    if (/^\s*crawl-delay\s*(:\s*)/i.test(beforeCursor)) {
      const signature = new vscode.SignatureInformation(
        "Crawl-delay: <seconds>",
        "specifies the number of seconds to wait between successive requests to the same server.",
      );

      signature.parameters = [
        new vscode.ParameterInformation(
          "<seconds>",
          "The number of seconds to wait between successive requests to the same server.",
        ),
      ];
      const help = new vscode.SignatureHelp();
      help.signatures = [signature];
      help.activeSignature = 0;
      help.activeParameter = 0;
      return help;
    }

    if (/^\s*clean-param\s*(:\s*)/i.test(beforeCursor)) {
      const signature = new vscode.SignatureInformation(
        "Clean-param: <params> [<path>]",
        "specifies a query parameter to be ignored by crawlers.",
      );

      signature.parameters = [
        new vscode.ParameterInformation(
          "<params>",
          "The query parameters to be ignored by crawlers (e.g. ref, ref&date).",
        ),
        new vscode.ParameterInformation(
          "<path>",
          "The path for which the query parameters should be ignored (optional).",
        ),
      ];
      const help = new vscode.SignatureHelp();
      help.signatures = [signature];
      help.activeSignature = 0;
      if (/^\s*clean-param\s*:\s*[-_A-Za-z0-9\&]+\s+/i.test(beforeCursor)) {
        help.activeParameter = 1;
      } else {
        help.activeParameter = 0;
      }
      return help;
    }

    return undefined;
  }
}
