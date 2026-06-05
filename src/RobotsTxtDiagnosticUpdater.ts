import * as vscode from "vscode";
import * as path from "path";
import { parseRobotsTxt, AstDirective } from "./parser/documentParser";
import { Span, isEmptySpan } from "./parser/span";
import { getLogger } from "./utils/logger";
import { DIRECTIVE_LOOKUP, ParameterInfo } from "./data/directiveInfo";
import { DIAGNOSTIC_LOOKUP, DiagnosticInfo } from "./data/diagnostics";
import * as constants from "./data/constants";

/** Regular expression to validate directive names. */
const REGEX_DIRECTIVE_NAME = /^[a-zA-Z]([a-zA-Z0-9_-]*[a-zA-Z])?$/;

/** Regular expression to validate product tokens. */
const REGEX_PRODUCT_TOKEN = /^([a-zA-Z_-]+$|^\*)$/;

/** Regular expression to validate encoded path patterns. */
const REGEX_ENCODED_PATH = /^[-$%&*./0-9=?A-Z_a-z~]+$/;

/** Regular expression to validate query parameters. (e.g. "param1&param2") */
const REGEX_QUERY_PARAMS = /^\w+(\&\w+)*$/;

/** Regular expression to validate numeric values. */
const REGEX_NUMERIC = /^\d+$/;

/** Regular expression to validate numeric values with leading zeros. */
const REGEX_LEADING_ZEROS = /^0+\d+$/;

/** Regular expression to validate URL encoding. */
const REGEX_VALID_URL_ENCODING = /^(?:[^%]|%[0-9A-Fa-f]{2})*$/;

/** Recommended maximum file size. (500 KiB) */
const FILE_SIZE_LIMIT = 500 * 1024;

/** Updates diagnostic collection for `robots.txt` files. */
export class RobotsTxtDiagnosticUpdater {
  /** The logger instance. */
  private readonly log = getLogger();

  /** The list of collected diagnostics. */
  private diagnostics: vscode.Diagnostic[] = [];

  /**
   * Updates the diagnostics for the given document by validating its content and structure according to the rules of `robots.txt` files.
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

      // Check the file itself for issues
      await this.checkFile(document);

      // Parse the robots.txt file
      const astRoot = parseRobotsTxt(document);

      for (const astDirective of astRoot.outside.rules) {
        this.addDiagnostic(
          DIAGNOSTIC_LOOKUP.DIRECTIVE_OUTSIDE,
          astDirective.name.range,
        );
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
            DIAGNOSTIC_LOOKUP.GROUP_MISSING_ALLOW_DISALLOW,
            group.userAgents[0]!.name.range,
          );
        }
      }

      for (const astDirective of astRoot.globals) {
        this.checkDirective(astDirective);
      }

      collection.set(document.uri, this.diagnostics);
    } catch (error) {
      this.log.error("Error updating diagnostics for document", error);
      collection.set(document.uri, []);
    } finally {
      this.log.trace("Finished updating diagnostics for document");
      this.diagnostics = [];
    }
  }

  /**
   * Checks the validity of the file itself, adding diagnostics for any issues found.
   * @param document The text document representing the robots.txt file to be checked.
   */
  private async checkFile(document: vscode.TextDocument): Promise<void> {
    if (document.isUntitled) {
      return;
    }

    if (path.basename(document.fileName) !== "robots.txt") {
      // The file name is not 'robots.txt'
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.FILENAME_INVALID,
        new vscode.Range(0, 0, 0, 0),
      );
    }

    if (document.encoding === "utf8bom") {
      // The file contains a UTF-8 BOM
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.ENCODING_UTF8_BOM,
        new vscode.Range(0, 0, 0, 0),
      );
    } else if (document.encoding !== "utf8") {
      // The file encoding is not UTF-8
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.ENCODING_NOT_UTF8,
        new vscode.Range(0, 0, 0, 0),
      );
    }

    const fileSize = await this.getFileSize(document);
    if (FILE_SIZE_LIMIT < fileSize) {
      // The file exceeds the recommended size limit of 500 KiB
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.FILESIZE_LARGE,
        new vscode.Range(0, 0, 0, 0),
      );
    }
  }

  /**
   * Checks the validity of a directive and its parameters, adding diagnostics for any issues found.
   * @param astDirective The AST node representing the directive to be checked.
   */
  private checkDirective(astDirective: AstDirective): void {
    const { type, name, separator, params } = astDirective;
    const directiveInfo = DIRECTIVE_LOOKUP[type];

    if (!REGEX_DIRECTIVE_NAME.test(type)) {
      // The directive name is invalid
      this.addDiagnostic(DIAGNOSTIC_LOOKUP.DIRECTIVE_NAME_INVALID, name.range);
    } else if (!directiveInfo) {
      // The directive is unknown
      this.addDiagnostic(DIAGNOSTIC_LOOKUP.DIRECTIVE_UNKNOWN, name.range);
    }

    if (separator === undefined) {
      // The directive is missing a colon
      this.addDiagnostic(DIAGNOSTIC_LOOKUP.DIRECTIVE_MISSING_COLON, name.range);
      return;
    }

    if (!directiveInfo) {
      // If the directive is unknown, we cannot validate its parameters
      return;
    }

    if (directiveInfo.isDeprecated) {
      // The directive is deprecated
      this.addDiagnostic(DIAGNOSTIC_LOOKUP.DIRECTIVE_DEPRECATED, name.range);
    }

    const maxParams = Math.min(directiveInfo.params.length, params.length);
    for (let i = 0; i < maxParams; i++) {
      this.checkParameter(directiveInfo.params[i]!, params[i]!);
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
    if (!REGEX_PRODUCT_TOKEN.test(productToken.text)) {
      // The product token is invalid
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PRODUCT_TOKEN_INVALID,
        productToken.range,
      );
    }
  }

  /**
   * Checks the validity of a path pattern parameter, adding diagnostics for any issues found.
   * @param paramToken The AST token representing the path pattern parameter to be checked.
   */
  private checkParamPathPattern(paramToken: Span): void {
    if (isEmptySpan(paramToken)) {
      return;
    }
    if (!REGEX_ENCODED_PATH.test(paramToken.text)) {
      // The path pattern contains unencoded characters that should be URL-encoded
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_URL_CHARACTER,
        paramToken.range,
      );
    } else if (!REGEX_VALID_URL_ENCODING.test(paramToken.text)) {
      // The path pattern contains invalid URL encoding
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_URL_ENCODING,
        paramToken.range,
      );
    }
    if (!paramToken.text.startsWith("/")) {
      // The path pattern does not start with a slash
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_NOT_START_SLASH,
        paramToken.range,
      );
    }
    if (paramToken.text.lastIndexOf("$", paramToken.text.length - 2) !== -1) {
      // The '$' character is only allowed at the end of the path pattern
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOLLAR,
        paramToken.range,
      );
    }
    if (paramToken.text.endsWith("*")) {
      // The wildcard is not necessary at the end of the path pattern
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_UNNECESSARY_WILDCARD,
        paramToken.range,
      );
    }
    if (paramToken.text.includes("**")) {
      // The '**' pattern is not necessary (use a single '*')
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOUBLE_ASTERISK,
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
      this.addDiagnostic(DIAGNOSTIC_LOOKUP.URL_INVALID, urlToken.range);
    }
  }

  /**
   * Checks the validity of a numeric parameter, adding diagnostics for any issues found.
   * @param paramToken The AST token representing the numeric parameter to be checked.
   */
  private checkParamNumeric(paramToken: Span): void {
    if (!REGEX_NUMERIC.test(paramToken.text)) {
      // The directive value is not a numeric
      this.addDiagnostic(DIAGNOSTIC_LOOKUP.NOT_NUMERIC, paramToken.range);
    }
    if (REGEX_LEADING_ZEROS.test(paramToken.text)) {
      // The directive value has leading zeros
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.NUMBER_LEADING_ZERO,
        paramToken.range,
      );
    }
  }

  /**
   * Checks the validity of a query parameters parameter, adding a diagnostic if it is invalid.
   * @param paramToken The AST token representing the query parameters parameter to be checked.
   */
  private checkParamQueryParams(paramToken: Span): void {
    if (!REGEX_QUERY_PARAMS.test(paramToken.text)) {
      // The directive value is invalid (query parameters should be in the format of 'key1&key2&key3')
      this.addDiagnostic(DIAGNOSTIC_LOOKUP.PARAM_INVALID, paramToken.range);
    }
  }

  /**
   * Retrieves the file size of the given document.
   * @param document The text document whose file size is to be retrieved.
   * @returns The size of the file in bytes.
   */
  private async getFileSize(document: vscode.TextDocument): Promise<number> {
    const stat = await vscode.workspace.fs.stat(document.uri);
    return stat.size;
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
