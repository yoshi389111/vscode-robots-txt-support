import * as vscode from "vscode";
import * as path from "path";
import { parseRobotsTxt, AstDirective } from "./parser/documentParser";
import { Span } from "./parser/span";
import { DIRECTIVE_INFOS, ParameterInfo } from "./data/directiveInfo";
import { getLogger } from "./utils/logger";
import * as constants from "./data/constants";

interface DiagnosticInfo {
  code: string;
  severity: vscode.DiagnosticSeverity;
  tag?: vscode.DiagnosticTag;
  message: string;
}

const DIAGNOSTIC_CODES = {
  FILENAME_INVALID: {
    code: "RBT001",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid file name. Expected 'robots.txt'.",
  },
  ENCODING_NOT_UTF8: {
    code: "RBT002",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid file encoding. Expected UTF-8.",
  },
  ENCODING_UTF8_BOM: {
    code: "RBT003",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "The file contains a UTF-8 BOM.",
  },
  FILESIZE_LARGE: {
    code: "RBT004",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Exceeds the recommended 500 KiB limit.",
  },

  DIRECTIVE_MISSING_COLON: {
    code: "RBT101",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Missing a colon.",
  },
  DIRECTIVE_NAME_INVALID: {
    code: "RBT102",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid directive name.",
  },
  DIRECTIVE_UNKNOWN: {
    code: "RBT103",
    severity: vscode.DiagnosticSeverity.Information,
    message: "Unknown directive.",
  },
  DIRECTIVE_OUTSIDE: {
    code: "RBT104",
    severity: vscode.DiagnosticSeverity.Warning,
    tag: vscode.DiagnosticTag.Unnecessary,
    message: "The directive is defined outside of a group.",
  },
  PRODUCT_TOKEN_INVALID: {
    code: "RBT105",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Invalid product token. Allowed: [A-Za-z_-] or single '*'",
  },
  GROUP_MISSING_ALLOW_DISALLOW: {
    code: "RBT106",
    severity: vscode.DiagnosticSeverity.Error,
    message: "No rules in the group.",
  },
  PATH_PATTERN_NOT_START_SLASH: {
    code: "RBT107",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Does not start with a slash.",
  },
  PATH_PATTERN_UNNECESSARY_WILDCARD: {
    code: "RBT108",
    severity: vscode.DiagnosticSeverity.Hint,
    message: "Unnecessary '*' at the end of the pattern.",
  },
  PATH_PATTERN_DOUBLE_ASTERISK: {
    code: "RBT109",
    severity: vscode.DiagnosticSeverity.Hint,
    message: "Unnecessary '**' (use a single '*').",
  },
  PATH_PATTERN_DOLLAR: {
    code: "RBT110",
    severity: vscode.DiagnosticSeverity.Error,
    message: "'$' is only allowed at the end of the pattern.",
  },
  PATH_PATTERN_INVALID_URLENCODE: {
    code: "RBT111",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid URL characters.",
  },

  URL_INVALID: {
    code: "RBT501",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid URL.",
  },
  DIRECTIVE_DEPRECATED: {
    code: "RBT502",
    severity: vscode.DiagnosticSeverity.Information,
    tag: vscode.DiagnosticTag.Deprecated,
    message: "Deprecated directive.",
  },
  NOT_NUMERIC: {
    code: "RBT503",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Value is not numeric.",
  },
  NUMBER_LEADING_ZERO: {
    code: "RBT504",
    severity: vscode.DiagnosticSeverity.Hint,
    message: "Consider removing leading zeros.",
  },
  PARAM_INVALID: {
    code: "RBT505",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Invalid directive value.",
  },
};

export class RobotsTxtDiagnosticUpdater {
  private readonly log = getLogger();

  /** The list of collected diagnostics. */
  private diagnostics: vscode.Diagnostic[] = [];

  /**
   * Updates the diagnostics for the given document by validating its content and structure according to the rules of robots.txt files.
   * @param document The text document to be validated and for which diagnostics will be updated.
   * @param collection The diagnostic collection to which the generated diagnostics will be added.
   */
  public async update(
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection,
  ): Promise<void> {
    this.log.trace("Updating diagnostics for document", document.fileName);
    try {
      this.diagnostics = [];

      if (!this.isValidFileName(document)) {
        // The file name is not 'robots.txt'
        this.addDiagnostic(
          DIAGNOSTIC_CODES.FILENAME_INVALID,
          new vscode.Range(0, 0, 0, 0),
        );
      }

      if (document.encoding === "utf8bom") {
        // The file contains a UTF-8 BOM
        this.addDiagnostic(
          DIAGNOSTIC_CODES.ENCODING_UTF8_BOM,
          new vscode.Range(0, 0, 0, 0),
        );
      } else if (document.encoding !== "utf8") {
        // The file encoding is not UTF-8
        this.addDiagnostic(
          DIAGNOSTIC_CODES.ENCODING_NOT_UTF8,
          new vscode.Range(0, 0, 0, 0),
        );
      }

      // Check for file size
      const isFileSizeValid = await this.isValidFileSize(document);
      if (!isFileSizeValid) {
        this.addDiagnostic(
          DIAGNOSTIC_CODES.FILESIZE_LARGE,
          new vscode.Range(0, 0, 0, 0),
        );
      }

      // Parse the robots.txt file
      const astRoot = parseRobotsTxt(document);

      for (const astDirective of astRoot.outside.rules) {
        this.addDiagnostic(
          DIAGNOSTIC_CODES.DIRECTIVE_OUTSIDE,
          astDirective.name.range,
        );
        this.checkDirective(astDirective);
      }

      for (const astDirective of astRoot.globals) {
        this.checkDirective(astDirective);
      }

      for (const group of astRoot.groups) {
        for (const userAgent of group.userAgents) {
          this.checkDirective(userAgent);
        }

        for (const rule of group.rules) {
          this.checkDirective(rule);
        }

        const hasAllowOrDisallowRule = group.rules.some((rule) =>
          ["allow", "disallow"].includes(rule.type),
        );
        if (!hasAllowOrDisallowRule) {
          // The group does not contain allow/disallow directives
          this.addDiagnostic(
            DIAGNOSTIC_CODES.GROUP_MISSING_ALLOW_DISALLOW,
            group.userAgents[0]!.name.range,
          );
        }
      }

      collection.set(document.uri, this.diagnostics);
    } catch (error) {
      this.log.error("Error updating diagnostics for document", error);
      collection.set(document.uri, []);
    } finally {
      this.log.trace("Finished updating diagnostics for document");
    }
  }

  /**
   * Checks the validity of a directive and its parameters, adding diagnostics for any issues found.
   * @param astDirective The AST node representing the directive to be checked.
   */
  private checkDirective(astDirective: AstDirective): void {
    const REGEX_DIRECTIVE_NAME = /^[a-zA-Z]([a-zA-Z0-9_-]*[a-zA-Z])?$/;

    const directiveType = astDirective.type;
    const nameToken = astDirective.name;

    const directiveInfo = DIRECTIVE_INFOS[directiveType];

    if (!REGEX_DIRECTIVE_NAME.test(directiveType)) {
      // The directive name is invalid
      this.addDiagnostic(
        DIAGNOSTIC_CODES.DIRECTIVE_NAME_INVALID,
        nameToken.range,
      );
    } else if (!directiveInfo) {
      // The directive is unknown
      this.addDiagnostic(DIAGNOSTIC_CODES.DIRECTIVE_UNKNOWN, nameToken.range);
    }

    if (astDirective.separator === undefined) {
      // The directive is missing a colon
      this.addDiagnostic(
        DIAGNOSTIC_CODES.DIRECTIVE_MISSING_COLON,
        nameToken.range,
      );
      return;
    }

    if (!directiveInfo) {
      return;
    }

    if (directiveInfo.isDeprecated) {
      // The directive is deprecated
      this.addDiagnostic(
        DIAGNOSTIC_CODES.DIRECTIVE_DEPRECATED,
        nameToken.range,
      );
    }

    const maxParams = Math.min(
      directiveInfo.params.length,
      astDirective.params.length,
    );
    for (let i = 0; i < maxParams; i++) {
      this.checkParameter(directiveInfo.params[i]!, astDirective.params[i]!);
    }
  }

  /**
   * Checks the validity of a directive parameter, adding diagnostics for any issues found.
   * @param paramInfo The information about the parameter.
   * @param paramToken The AST token representing the parameter to be checked.
   */
  private checkParameter(paramInfo: ParameterInfo, paramToken: Span): void {
    switch (paramInfo.validationType) {
      case "product-token":
        this.checkParamProductToken(paramToken);
        return;

      case "path-pattern":
        this.checkParamPathPattern(paramToken);
        return;

      case "url":
        this.checkParamUrl(paramToken);
        return;

      case "number":
        this.checkParamNumeric(paramToken);
        return;

      case "query-params":
        this.checkParamQueryParams(paramToken);
        return;

      case "no-check":
        return;
    }
  }

  /**
   * Checks the validity of a product token parameter, adding a diagnostic if it is invalid.
   * @param productToken The AST token representing the product token parameter to be checked.
   */
  private checkParamProductToken(productToken: Span): void {
    const REGEX_PRODUCT_TOKEN = /^([a-zA-Z_-]+$|^\*)$/;
    if (!REGEX_PRODUCT_TOKEN.test(productToken.text)) {
      // The product token is invalid
      this.addDiagnostic(
        DIAGNOSTIC_CODES.PRODUCT_TOKEN_INVALID,
        productToken.range,
      );
    }
  }

  /**
   * Checks the validity of a path pattern parameter, adding diagnostics for any issues found.
   * @param paramToken The AST token representing the path pattern parameter to be checked.
   */
  private checkParamPathPattern(paramToken: Span): void {
    if (paramToken.text === "") {
      return;
    }
    if (!/^[-$%&*./0-9=?A-Z_a-z~]+$/.test(paramToken.text)) {
      // The path pattern contains unencoded characters that should be URL-encoded
      this.addDiagnostic(
        DIAGNOSTIC_CODES.PATH_PATTERN_INVALID_URLENCODE,
        paramToken.range,
      );
    }
    if (!paramToken.text.startsWith("/")) {
      // The path pattern does not start with a slash
      this.addDiagnostic(
        DIAGNOSTIC_CODES.PATH_PATTERN_NOT_START_SLASH,
        paramToken.range,
      );
    }
    if (paramToken.text.lastIndexOf("$", paramToken.text.length - 2) !== -1) {
      // The '$' character is only allowed at the end of the path pattern
      this.addDiagnostic(
        DIAGNOSTIC_CODES.PATH_PATTERN_DOLLAR,
        paramToken.range,
      );
    }
    if (paramToken.text.endsWith("*")) {
      // The wildcard is not necessary at the end of the path pattern
      this.addDiagnostic(
        DIAGNOSTIC_CODES.PATH_PATTERN_UNNECESSARY_WILDCARD,
        paramToken.range,
      );
    }
    if (paramToken.text.includes("**")) {
      // The '**' pattern is not necessary (use a single '*')
      this.addDiagnostic(
        DIAGNOSTIC_CODES.PATH_PATTERN_DOUBLE_ASTERISK,
        paramToken.range,
      );
    }
  }

  /**
   * Checks the validity of a URL parameter, adding a diagnostic if it is invalid.
   * @param urlToken The AST token representing the URL parameter to be checked.
   */
  private checkParamUrl(urlToken: Span): void {
    if (!this.isValidUri(urlToken.text)) {
      // The directive value is not a valid URL
      this.addDiagnostic(DIAGNOSTIC_CODES.URL_INVALID, urlToken.range);
    }
  }

  /**
   * Checks the validity of a numeric parameter, adding diagnostics for any issues found.
   * @param paramToken The AST token representing the numeric parameter to be checked.
   */
  private checkParamNumeric(paramToken: Span): void {
    if (!/^\d+$/.test(paramToken.text)) {
      // The directive value is not a numeric
      this.addDiagnostic(DIAGNOSTIC_CODES.NOT_NUMERIC, paramToken.range);
    }
    if (/^0+\d+$/.test(paramToken.text)) {
      // The directive value has leading zeros
      this.addDiagnostic(
        DIAGNOSTIC_CODES.NUMBER_LEADING_ZERO,
        paramToken.range,
      );
    }
  }

  /**
   * Checks the validity of a query parameters parameter, adding a diagnostic if it is invalid.
   * @param paramToken The AST token representing the query parameters parameter to be checked.
   */
  private checkParamQueryParams(paramToken: Span): void {
    if (!/^\w+(\&\w+)*$/.test(paramToken.text)) {
      // The directive value is invalid (query parameters should be in the format of 'key1&key2&key3')
      this.addDiagnostic(DIAGNOSTIC_CODES.PARAM_INVALID, paramToken.range);
    }
  }

  /**
   * Checks if the given document has a valid file name (robots.txt).
   * @param document The text document to check.
   * @return True if the file name is valid, false otherwise.
   */
  private isValidFileName(document: vscode.TextDocument): boolean {
    return path.basename(document.fileName) === "robots.txt";
  }

  /**
   * Checks if the given document has a valid file size (not exceeding 500 KiB).
   * @param document The text document to check.
   * @returns True if the file size is valid, false otherwise.
   */
  private async isValidFileSize(
    document: vscode.TextDocument,
  ): Promise<boolean> {
    if (document.isUntitled) {
      return true;
    }
    const stat = await vscode.workspace.fs.stat(document.uri);
    return stat.size <= 500 * 1024;
  }

  /**
   * Checks if the given URI is valid according to the rules for sitemap directive values.
   * @param uri The URI to validate.
   * @returns True if the URI is valid, false otherwise.
   */
  private isValidUri(uri: string): boolean {
    if (uri.includes(" ")) {
      return false;
    }
    if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
      return false;
    }
    try {
      new URL(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Adds a diagnostic to the collection based on the provided diagnostic information and range.
   * @param diagnosticInfo The information about the diagnostic to be added, including code, severity, message, and optional tag.
   * @param range The range in the document where the diagnostic should be applied.
   */
  public addDiagnostic(
    diagnosticInfo: DiagnosticInfo,
    range: vscode.Range,
  ): void {
    const diagnostic: vscode.Diagnostic = {
      message: diagnosticInfo.message,
      range,
      severity: diagnosticInfo.severity,
      code: diagnosticInfo.code,
      source: constants.EXTENSION_DISPLAY_NAME,
    };
    if (diagnosticInfo.tag) {
      diagnostic.tags = [diagnosticInfo.tag];
    }
    this.diagnostics.push(diagnostic);
  }
}
