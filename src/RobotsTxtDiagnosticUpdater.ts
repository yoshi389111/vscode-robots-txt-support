import * as path from "path";
import * as vscode from "vscode";
import { getAst } from "./RobotsTxtAstAsyncCache";
import { getSimilarDirective } from "./RobotsTxtSimilarDirective";
import * as constants from "./data/constants";
import { DIAGNOSTIC_LOOKUP, DiagnosticInfo } from "./data/diagnostics";
import { DIRECTIVE_LOOKUP, ParameterInfo } from "./data/directiveInfo";
import { AstDirective } from "./parser/documentParser";
import { Span, isEmptySpan } from "./parser/span";
import { DelayExecutor } from "./utils/DelayExecutor";
import { calculateEditDistance } from "./utils/calculateEditDistance";
import { getLogger } from "./utils/logger";

/** Updates diagnostic collection for `robots.txt` files. */
export class RobotsTxtDiagnosticUpdater {
  /** The logger instance. */
  private readonly log = getLogger();

  /** The list of collected diagnostics. */
  private diagnostics: vscode.Diagnostic[] = [];

  /**
   * Registers the diagnostic updater for `robots.txt` files.
   * @param delayTime The delay time in milliseconds to debounce the diagnostic updates.
   * @returns A disposable that can be used to unregister the provider
   */
  public static register(delayTime: number): vscode.Disposable {
    const delayExecutor = new DelayExecutor();
    const diagnostics = vscode.languages.createDiagnosticCollection(
      constants.LANGUAGE_ID,
    );
    const diagnosticUpdater = new RobotsTxtDiagnosticUpdater();
    const diagnosticUpdate = (
      document: vscode.TextDocument,
      similarityCheck = false,
    ) => {
      if (document.languageId === constants.LANGUAGE_ID || similarityCheck) {
        delayExecutor.execute(
          () => diagnosticUpdater.update(document, diagnostics),
          delayTime,
        );
      }
    };

    function* disposables(): Iterable<vscode.Disposable> {
      // Initial diagnostics collection for the active editor
      if (vscode.window.activeTextEditor) {
        diagnosticUpdate(vscode.window.activeTextEditor.document, true);
      }
      // Listen to document opens and update diagnostics
      yield vscode.workspace.onDidOpenTextDocument((document) =>
        diagnosticUpdate(document, true),
      );
      // Listen to document saves and update diagnostics
      yield vscode.workspace.onDidSaveTextDocument(diagnosticUpdate);
      // Listen to document closures and update diagnostics
      yield vscode.workspace.onDidCloseTextDocument(diagnosticUpdate);
      // Listen to document changes and update diagnostics
      yield vscode.workspace.onDidChangeTextDocument((event) => {
        diagnosticUpdate(event.document);
      });
      // Listen to active editor changes and update diagnostics
      yield vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          diagnosticUpdate(editor.document);
        }
      });

      // Listen to file deletions and delete diagnostics
      yield vscode.workspace.onDidDeleteFiles((event) => {
        event.files.forEach((uri) => diagnostics.delete(uri));
      });
      // Listen to file renames and delete diagnostics for old URIs
      yield vscode.workspace.onDidRenameFiles((event) => {
        event.files.forEach((files) => diagnostics.delete(files.oldUri));
      });
    }
    return vscode.Disposable.from(delayExecutor, diagnostics, ...disposables());
  }

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

      if (document.languageId === constants.LANGUAGE_ID) {
        await this.checkRobotsTxt(document);
      } else {
        this.checkSimilarityBasedFileName(document);
      }

      if (this.diagnostics.length === 0) {
        collection.delete(document.uri);
      } else {
        collection.set(document.uri, this.diagnostics);
      }
    } catch (error) {
      this.log.error("Error updating diagnostics for document", error);
      collection.delete(document.uri);
    } finally {
      this.log.trace("Finished updating diagnostics for document");
      this.diagnostics = [];
    }
  }

  /**
   * Checks the validity of the given `robots.txt` document.
   * @param document The text document representing the `robots.txt` file to be checked.
   */
  private async checkRobotsTxt(document: vscode.TextDocument): Promise<void> {
    // Check the file itself for issues
    await this.checkFile(document);

    // Parse the robots.txt file
    const astRoot = await getAst(document);

    for (const astDirective of astRoot.outside.rules) {
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.DIRECTIVE_OUTSIDE,
        DIAGNOSTIC_LOOKUP.DIRECTIVE_OUTSIDE.message(),
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
          DIAGNOSTIC_LOOKUP.GROUP_MISSING_ALLOW_DISALLOW.message(),
          group.userAgents[group.userAgents.length - 1]!.name.range,
        );
      }
    }

    for (const astDirective of astRoot.globals) {
      this.checkDirective(astDirective);
    }
  }

  /**
   * Checks if the file name of the given document is similar to 'robots.txt' and adds a diagnostic if it is, suggesting a possible typo.
   * @param document The text document whose file name is to be checked for similarity to 'robots.txt'.
   */
  private checkSimilarityBasedFileName(document: vscode.TextDocument): void {
    const SIMILAR_THRESHOLD = 1;
    const REGULAR_NAME = "robots.txt";
    const targetName = path.basename(document.fileName);
    if (
      targetName === REGULAR_NAME ||
      SIMILAR_THRESHOLD < Math.abs(REGULAR_NAME.length - targetName.length)
    ) {
      return;
    }

    const lowerFileName = targetName.toLowerCase();
    const distance = calculateEditDistance(REGULAR_NAME, lowerFileName);
    if (distance <= SIMILAR_THRESHOLD) {
      // The file name is similar to 'robots.txt'
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.FILENAME_SIMILAR,
        DIAGNOSTIC_LOOKUP.FILENAME_SIMILAR.message(),
        new vscode.Range(0, 0, 0, 0),
      );
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
        DIAGNOSTIC_LOOKUP.FILENAME_INVALID.message(),
        new vscode.Range(0, 0, 0, 0),
      );
    }

    if (document.encoding === "utf8bom") {
      // The file contains a UTF-8 BOM
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.ENCODING_UTF8_BOM,
        DIAGNOSTIC_LOOKUP.ENCODING_UTF8_BOM.message(),
        new vscode.Range(0, 0, 0, 0),
      );
    } else if (document.encoding !== "utf8") {
      // The file encoding is not UTF-8
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.ENCODING_NOT_UTF8,
        DIAGNOSTIC_LOOKUP.ENCODING_NOT_UTF8.message(),
        new vscode.Range(0, 0, 0, 0),
      );
    }

    // Recommended maximum file size. (500 KiB)
    const FILE_SIZE_LIMIT = 500 * 1024;
    const fileSize = await this.getFileSize(document);
    if (FILE_SIZE_LIMIT < fileSize) {
      // The file exceeds the recommended size limit of 500 KiB
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.FILESIZE_LARGE,
        DIAGNOSTIC_LOOKUP.FILESIZE_LARGE.message(),
        new vscode.Range(0, 0, 0, 0),
      );
    }
  }

  /**
   * Checks the validity of a directive and its parameters, adding diagnostics for any issues found.
   * @param astDirective The AST node representing the directive to be checked.
   */
  private checkDirective(astDirective: AstDirective): void {
    const REGEX_DIRECTIVE_NAME = /^[a-zA-Z]([a-zA-Z0-9_-]*[a-zA-Z])?$/;
    const { type, name, separator, params } = astDirective;
    const directiveInfo = DIRECTIVE_LOOKUP[type];

    if (!REGEX_DIRECTIVE_NAME.test(type)) {
      // The directive name is invalid
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.DIRECTIVE_NAME_INVALID,
        DIAGNOSTIC_LOOKUP.DIRECTIVE_NAME_INVALID.message(),
        name.range,
      );
    } else if (!directiveInfo) {
      // The directive is unknown
      this.checkUnknownDirective(type, name.range);
    }

    if (separator === undefined) {
      // The directive is missing a colon
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.DIRECTIVE_MISSING_COLON,
        DIAGNOSTIC_LOOKUP.DIRECTIVE_MISSING_COLON.message(),
        name.range,
      );
      return;
    }

    if (!directiveInfo) {
      // If the directive is unknown, we cannot validate its parameters
      return;
    }

    if (directiveInfo.isDeprecated) {
      // The directive is deprecated
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.DIRECTIVE_DEPRECATED,
        DIAGNOSTIC_LOOKUP.DIRECTIVE_DEPRECATED.message(),
        name.range,
      );
    }

    const maxParams = Math.min(directiveInfo.params.length, params.length);
    for (let i = 0; i < maxParams; i++) {
      this.checkParameter(directiveInfo.params[i]!, params[i]!);
    }
  }

  /**
   * Check if an unknown directive is a typo, determine a diagnostic message, and add it.
   * @param directiveType The type of the directive to be checked.
   * @param range The range in the document where the directive is located, used for adding diagnostics.
   */
  private checkUnknownDirective(
    directiveType: string,
    range: vscode.Range,
  ): void {
    const similarDirective = getSimilarDirective(directiveType);
    if (similarDirective) {
      // The directive is similar to a known directive, suggesting a possible typo
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.DIRECTIVE_UNKNOWN_SUGGESTION,
        DIAGNOSTIC_LOOKUP.DIRECTIVE_UNKNOWN_SUGGESTION.message(
          similarDirective,
        ),
        range,
      );
    } else {
      // The directive is unknown
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.DIRECTIVE_UNKNOWN,
        DIAGNOSTIC_LOOKUP.DIRECTIVE_UNKNOWN.message(),
        range,
      );
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
        DIAGNOSTIC_LOOKUP.PRODUCT_TOKEN_INVALID,
        DIAGNOSTIC_LOOKUP.PRODUCT_TOKEN_INVALID.message(),
        productToken.range,
      );
    }
  }

  /**
   * Checks the validity of a path pattern parameter, adding diagnostics for any issues found.
   * @param paramToken The AST token representing the path pattern parameter to be checked.
   */
  private checkParamPathPattern(paramToken: Span): void {
    const REGEX_ENCODED_PATH = /^[-!$%&'()*+,./0-9:;=?@A-Z_a-z~]+$/;
    const REGEX_VALID_URL_ENCODING = /^(?:[^%]|%[0-9A-Fa-f]{2})*$/;
    if (isEmptySpan(paramToken)) {
      return;
    }
    if (!REGEX_ENCODED_PATH.test(paramToken.text)) {
      // The path pattern contains unencoded characters that should be URL-encoded
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_URL_CHARACTER,
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_URL_CHARACTER.message(),
        paramToken.range,
      );
      return;
    } else if (!REGEX_VALID_URL_ENCODING.test(paramToken.text)) {
      // The path pattern contains invalid percent-encoding
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_PERCENT_ENCODING,
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_PERCENT_ENCODING.message(),
        paramToken.range,
      );
      return;
    }
    if (!paramToken.text.startsWith("/")) {
      // The path pattern does not start with a slash
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_NOT_START_SLASH,
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_NOT_START_SLASH.message(),
        paramToken.range,
      );
    }

    const REGEX_LOWERCASE_URL_ENCODING =
      /%(?:[a-f][0-9A-F]|[0-9A-F][a-f]|[a-f]{2})/;
    if (REGEX_LOWERCASE_URL_ENCODING.test(paramToken.text)) {
      // The path pattern contains lowercase letters in percent-encoding (should be uppercase)
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_LOWERCASE_URL_ENCODING,
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_LOWERCASE_URL_ENCODING.message(),
        paramToken.range,
      );
    }

    if (paramToken.text.lastIndexOf("$", paramToken.text.length - 2) !== -1) {
      // The '$' character is only allowed at the end of the path pattern
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOLLAR,
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOLLAR.message(),
        paramToken.range,
      );
    }
    if (paramToken.text.endsWith("*")) {
      // The wildcard is not necessary at the end of the path pattern
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_UNNECESSARY_WILDCARD,
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_UNNECESSARY_WILDCARD.message(),
        paramToken.range,
      );
    }
    if (paramToken.text.includes("**")) {
      // The '**' pattern is not necessary (use a single '*')
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOUBLE_ASTERISK,
        DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOUBLE_ASTERISK.message(),
        paramToken.range,
      );
    }
    if (
      paramToken.text.includes("&amp;") ||
      paramToken.text.includes("&lt;") ||
      paramToken.text.includes("&gt;") ||
      paramToken.text.includes("&quot;") ||
      paramToken.text.includes("&apos;")
    ) {
      // HTML entity references are not supported in robots.txt files
      this.addDiagnosticWithRegex(
        DIAGNOSTIC_LOOKUP.FOUND_ENTITY_REFERENCING,
        DIAGNOSTIC_LOOKUP.FOUND_ENTITY_REFERENCING.message(),
        paramToken,
        /&(?:amp|lt|gt|quot|apos);/g,
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
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.URL_INVALID,
        DIAGNOSTIC_LOOKUP.URL_INVALID.message(),
        urlToken.range,
      );
    }
  }

  /**
   * Checks the validity of a numeric parameter, adding diagnostics for any issues found.
   * @param paramToken The AST token representing the numeric parameter to be checked.
   */
  private checkParamNumeric(paramToken: Span): void {
    const REGEX_NUMERIC = /^\d+$/;
    if (!REGEX_NUMERIC.test(paramToken.text)) {
      // The directive value is not a numeric
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.NOT_NUMERIC,
        DIAGNOSTIC_LOOKUP.NOT_NUMERIC.message(),
        paramToken.range,
      );
    }
    const REGEX_LEADING_ZEROS = /^0+\d+$/;
    if (REGEX_LEADING_ZEROS.test(paramToken.text)) {
      // The directive value has leading zeros
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.NUMBER_LEADING_ZERO,
        DIAGNOSTIC_LOOKUP.NUMBER_LEADING_ZERO.message(),
        paramToken.range,
      );
    }
  }

  /**
   * Checks the validity of a query parameters parameter, adding a diagnostic if it is invalid.
   * @param paramToken The AST token representing the query parameters parameter to be checked.
   */
  private checkParamQueryParams(paramToken: Span): void {
    const REGEX_QUERY_PARAMS = /^\w+(\&\w+)*$/;
    if (!REGEX_QUERY_PARAMS.test(paramToken.text)) {
      // The directive value is invalid (query parameters should be in the format of 'key1&key2&key3')
      this.addDiagnostic(
        DIAGNOSTIC_LOOKUP.PARAM_INVALID,
        DIAGNOSTIC_LOOKUP.PARAM_INVALID.message(),
        paramToken.range,
      );
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
   * Adds diagnostics for all matches of a regular expression within a given text segment.
   * @param diagnosticInfo The information about the diagnostic to be added, including code, severity, and optional tag.
   * @param message The message for the diagnostic.
   * @param segment The text segment in which to search for matches of the regular expression, and where the diagnostics will be applied.
   * @param regex The regular expression to be applied to the text segment to find matches for which diagnostics will be added.
   */
  private addDiagnosticWithRegex(
    diagnosticInfo: DiagnosticInfo,
    message: string,
    segment: Span,
    regex: RegExp,
  ): void {
    const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
    const globalRegex = new RegExp(regex.source, flags);
    globalRegex.lastIndex = 0;

    const text = segment.text;
    let match: RegExpExecArray | null;
    while ((match = globalRegex.exec(text)) !== null) {
      if (match[0].length === 0) {
        globalRegex.lastIndex++;
        continue;
      }
      const matchStart = segment.range.start.translate(0, match.index);
      const matchEnd = matchStart.translate(0, match[0].length);
      const matchRange = new vscode.Range(matchStart, matchEnd);
      this.addDiagnostic(diagnosticInfo, message, matchRange);
    }
  }

  /**
   * Adds a diagnostic to the collection based on the provided diagnostic information and range.
   * @param diagnosticInfo The information about the diagnostic to be added, including code, severity, and optional tag.
   * @param message The message for the diagnostic.
   * @param range The range in the document where the diagnostic should be applied.
   */
  private addDiagnostic(
    diagnosticInfo: DiagnosticInfo,
    message: string,
    range: vscode.Range,
  ): void {
    const diagnostic: vscode.Diagnostic = {
      message,
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
