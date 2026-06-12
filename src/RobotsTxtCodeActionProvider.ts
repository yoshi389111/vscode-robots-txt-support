import * as vscode from "vscode";
import { getSimilarDirective } from "./RobotsTxtSimilarDirective";
import { getLogger } from "./utils/logger";
import { DIAGNOSTIC_LOOKUP } from "./data/diagnostics";

/** Provides code actions for `robots.txt` files. */
export class RobotsTxtCodeActionProvider implements vscode.CodeActionProvider {
  /** The logger instance. */
  private readonly log = getLogger();

  /** Metadata for the code action provider. */
  public static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [
      vscode.CodeActionKind.QuickFix,
      vscode.CodeActionKind.Refactor,
    ],
  };

  /**
   * Provides code actions for the given document and range based on the diagnostics present in the context.
   * @param document The text document for which to provide code actions.
   * @param range The range for which to provide code actions.
   * @param context The context containing diagnostics and other information for which to provide code actions.
   * @param _token A cancellation token.
   * @returns An array of code actions or commands to apply to the document.
   */
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    this.log.trace(
      "Providing code actions",
      document.fileName,
      context.triggerKind,
      context.only,
    );
    try {
      const actions: vscode.CodeAction[] = [];

      if (
        !context.only ||
        vscode.CodeActionKind.QuickFix.contains(context.only)
      ) {
        // Provide quick fixes for diagnostics
        for (const diagnostic of context.diagnostics) {
          actions.push(...this.provideQuickFixes(document, diagnostic));
        }
      }

      if (
        !context.only ||
        vscode.CodeActionKind.Refactor.contains(context.only)
      ) {
        // Provide refactorings
        actions.push(...this.provideRefactorings(document, range));
      }

      if (
        !context.only ||
        vscode.CodeActionKind.Source.contains(context.only)
      ) {
        // Provide source actions
        actions.push(...this.provideSourceActions(document));
      }

      return actions;
    } catch (error) {
      this.log.error("Error providing code actions", error);
      return undefined;
    } finally {
      this.log.trace("Finished providing code actions");
    }
  }

  /**
   * Provides quick fixes for diagnostics in the robots.txt document.
   * @param document The text document containing the diagnostics.
   * @param diagnostic The diagnostic for which to provide quick fixes.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private provideQuickFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    switch (diagnostic.code) {
      case DIAGNOSTIC_LOOKUP.NUMBER_LEADING_ZERO.code:
        return this.createLeadingZerosRemovalFix(document, diagnostic);

      case DIAGNOSTIC_LOOKUP.DIRECTIVE_MISSING_COLON.code:
        return this.createMissingColonFix(document, diagnostic);

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_NOT_START_SLASH.code:
        return this.createPathPatternNotStartSlashFix(document, diagnostic);

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOUBLE_ASTERISK.code:
        return this.createPathPatternDoubleAsteriskFix(document, diagnostic);

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_UNNECESSARY_WILDCARD.code:
        return this.createPathPatternUnnecessaryWildcardFix(
          document,
          diagnostic,
        );

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOLLAR.code:
        return this.createPathPatternDollarFix(document, diagnostic);

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_URL_CHARACTER.code:
        return this.createPathPatternInvalidUrlCharacterFix(
          document,
          diagnostic,
        );

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_PERCENT_ENCODING.code:
        return this.createPathPatternInvalidPercentEncodingFix(
          document,
          diagnostic,
        );

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_LOWERCASE_URL_ENCODING.code:
        return this.createPathPatternLowercaseUrlEncodingFix(
          document,
          diagnostic,
        );

      case DIAGNOSTIC_LOOKUP.DIRECTIVE_UNKNOWN_SUGGESTION.code:
        return this.createUnknownDirectiveFix(document, diagnostic);

      case DIAGNOSTIC_LOOKUP.GROUP_MISSING_ALLOW_DISALLOW.code:
        return this.createGroupMissingAllowDisallowFix(document, diagnostic);

      case DIAGNOSTIC_LOOKUP.FOUND_ENTITY_REFERENCING.code:
        return this.createFoundEntityReferencingFix(document, diagnostic);

      default:
        return [];
    }
  }

  /**
   * Creates a code action to remove leading zeros from a numeric value.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createLeadingZerosRemovalFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const REGEX_LEADING_ZEROS = /^0+(?!$)/;
    const cleanedString = document
      .getText(diagnostic.range)
      .replace(REGEX_LEADING_ZEROS, "");

    const fix = this.createReplaceFix(
      document,
      diagnostic,
      cleanedString,
      vscode.l10n.t("Remove leading zeros"),
    );

    return [fix];
  }

  /**
   * Creates a code action to insert a missing colon in a directive.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createMissingColonFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const insertedString = `${document.getText(diagnostic.range)}: `;

    const fix = this.createReplaceFix(
      document,
      diagnostic,
      insertedString,
      vscode.l10n.t("Append missing ':'"),
    );

    return [fix];
  }

  /**
   * Creates a code action to insert a leading slash in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createPathPatternNotStartSlashFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const insertedString = `/${document.getText(diagnostic.range)}`;

    const fix = this.createReplaceFix(
      document,
      diagnostic,
      insertedString,
      vscode.l10n.t("Insert leading '/'"),
    );

    return [fix];
  }

  /**
   * Creates a code action to replace double asterisks with a single asterisk in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createPathPatternDoubleAsteriskFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const REGEX_DOUBLE_ASTERISK = /\*\*+/g;
    const cleanedString = document
      .getText(diagnostic.range)
      .replace(REGEX_DOUBLE_ASTERISK, "*");

    const fix = this.createReplaceFix(
      document,
      diagnostic,
      cleanedString,
      this.getMessageReplaceWith("*"),
    );

    return [fix];
  }

  /**
   * Creates a code action to remove unnecessary wildcards at the end of a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createPathPatternUnnecessaryWildcardFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const REGEX_TRAILING_ASTERISKS = /\*+$/;
    const cleanedString = document
      .getText(diagnostic.range)
      .replace(REGEX_TRAILING_ASTERISKS, "");

    const fix = this.createReplaceFix(
      document,
      diagnostic,
      cleanedString,
      this.getMessageRemoveUnnecessary("*"),
    );

    return [fix];
  }

  /**
   * Creates a code action to encode or remove invalid '$' characters in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createPathPatternDollarFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const REGEX_DOLLAR_SIGN_NOT_AT_END = /\$(?=.)/g;
    const targetString = document.getText(diagnostic.range);

    const replacedString = targetString.replace(
      REGEX_DOLLAR_SIGN_NOT_AT_END,
      "%24",
    );
    const fixReplace = this.createReplaceFix(
      document,
      diagnostic,
      replacedString,
      this.getMessageEncodeInvalid("$"),
    );

    const removedString = targetString.replace(
      REGEX_DOLLAR_SIGN_NOT_AT_END,
      "",
    );
    const fixRemove = this.createReplaceFix(
      document,
      diagnostic,
      removedString,
      this.getMessageRemoveInvalid("$"),
      false,
    );

    return [fixReplace, fixRemove];
  }

  /**
   * Creates a code action to encode invalid URL characters in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createPathPatternInvalidUrlCharacterFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const targetString = document.getText(diagnostic.range);
    const replacedString = encodeURI(targetString);
    const fixReplace = this.createReplaceFix(
      document,
      diagnostic,
      replacedString,
      vscode.l10n.t("Encode invalid URL characters"),
    );

    return [fixReplace];
  }

  /**
   * Creates a code action to encode or remove invalid '%' characters in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createPathPatternInvalidPercentEncodingFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const REGEX_INVALID_URL_ENCODING = /%(?![0-9A-Fa-f]{2})/g;
    const targetString = document.getText(diagnostic.range);

    const replacedString = targetString.replace(
      REGEX_INVALID_URL_ENCODING,
      "%25",
    );
    const fixReplace = this.createReplaceFix(
      document,
      diagnostic,
      replacedString,
      this.getMessageEncodeInvalid("%"),
    );

    const removedString = targetString.replace(REGEX_INVALID_URL_ENCODING, "");
    const fixRemove = this.createReplaceFix(
      document,
      diagnostic,
      removedString,
      this.getMessageRemoveInvalid("%"),
      false,
    );

    return [fixReplace, fixRemove];
  }

  /**
   * Creates a code action to convert percent-encoding in a path pattern to uppercase.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createPathPatternLowercaseUrlEncodingFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const targetString = document.getText(diagnostic.range);
    const replacedString = targetString.replace(/%[0-9A-Fa-f]{2}/g, (match) =>
      match.toUpperCase(),
    );
    const fixReplace = this.createReplaceFix(
      document,
      diagnostic,
      replacedString,
      vscode.l10n.t("Convert percent-encoding to uppercase"),
    );

    return [fixReplace];
  }

  /**
   * Creates a code action to replace an unknown directive with a suggested valid directive based on similarity.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic, or an empty array if no similar directive is found.
   */
  private createUnknownDirectiveFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const directivePart = document.getText(diagnostic.range);
    const suggestedDirective = getSimilarDirective(directivePart);
    if (!suggestedDirective) {
      return [];
    }
    const fix = this.createReplaceFix(
      document,
      diagnostic,
      suggestedDirective,
      this.getMessageReplaceWith(suggestedDirective),
    );
    return [fix];
  }

  /**
   * Creates code actions to insert missing 'Allow' and 'Disallow' directives in a group that has no rules.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createGroupMissingAllowDisallowFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    const fixDisallow = this.createInsertNextLineFix(
      document,
      diagnostic,
      "Disallow: ",
      this.getMessageInsertDirective("Disallow:"),
    );
    const fixAllow = this.createInsertNextLineFix(
      document,
      diagnostic,
      "Allow: ",
      this.getMessageInsertDirective("Allow:"),
      false,
    );
    return [fixDisallow, fixAllow];
  }

  /**
   * Creates code actions to encode HTML entity references found in the document.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the presence of HTML entity references.
   * @returns An array of code actions representing quick fixes to encode the HTML entity references.
   */
  private createFoundEntityReferencingFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction[] {
    let encodedString = "";
    switch (document.getText(diagnostic.range)) {
      case "&amp;":
        encodedString = "%26";
        break;
      case "&lt;":
        encodedString = "%3C";
        break;
      case "&gt;":
        encodedString = "%3E";
        break;
      case "&quot;":
        encodedString = "%22";
        break;
      case "&apos;":
        encodedString = "%27";
        break;
      default:
        return [];
    }

    const fix = this.createReplaceFix(
      document,
      diagnostic,
      encodedString,
      this.getMessageReplaceWith(encodedString),
    );
    return [fix];
  }

  /**
   * Helper method to create a code action that replaces the text in the diagnostic range with the provided new text.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic for which to create the code action.
   * @param newText The new text to replace the diagnostic range with.
   * @param title The title of the code action.
   * @param isPreferred Whether the code action is preferred.
   * @returns A code action representing the quick fix.
   */
  private createReplaceFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    newText: string,
    title: string,
    isPreferred: boolean = true,
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(document.uri, diagnostic.range, newText);
    fix.diagnostics = [diagnostic];
    fix.isPreferred = isPreferred;
    return fix;
  }

  /**
   * Helper method to create a code action that inserts new text at the next line after the diagnostic.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic for which to create the code action.
   * @param newText The new text to insert at the next line after the diagnostic.
   * @param title The title of the code action.
   * @param isPreferred Whether the code action is preferred.
   * @returns A code action representing the quick fix.
   */
  private createInsertNextLineFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    newText: string,
    title: string,
    isPreferred: boolean = true,
  ): vscode.CodeAction {
    const eol = document.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    const message = `${eol}${newText}`;
    const lineRange = document.lineAt(diagnostic.range.end).range;
    const fix = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.insert(document.uri, lineRange.end, message);
    fix.diagnostics = [diagnostic];
    fix.isPreferred = isPreferred;
    return fix;
  }

  /**
   * Provides refactorings for the robots.txt document.
   * @param document The text document for which to provide refactorings.
   * @param range The range for which to provide refactorings.
   * @returns An array of code actions representing refactorings for the given document.
   */
  private provideRefactorings(
    document: vscode.TextDocument,
    range: vscode.Range,
  ): vscode.CodeAction[] {
    const refactorings: vscode.CodeAction[] = [];
    const text = document.getText(range);

    {
      const replacedText = encodeURI(text);
      if (replacedText !== text) {
        const fix = new vscode.CodeAction(
          vscode.l10n.t("URL-encode (Path Style)"),
          vscode.CodeActionKind.RefactorRewrite,
        );
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, range, replacedText);
        refactorings.push(fix);
      }
    }

    {
      const replacedText = encodeURIComponent(text);
      if (replacedText !== text) {
        const fix = new vscode.CodeAction(
          vscode.l10n.t("URL-encode (Query Parameter Style)"),
          vscode.CodeActionKind.RefactorRewrite,
        );
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, range, replacedText);
        refactorings.push(fix);
      }
    }

    {
      let replacedText: string;
      try {
        replacedText = decodeURI(text);
      } catch {
        replacedText = text;
      }
      if (replacedText !== text) {
        const fix = new vscode.CodeAction(
          vscode.l10n.t("URL-decode (Path Style)"),
          vscode.CodeActionKind.RefactorRewrite,
        );
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, range, replacedText);
        refactorings.push(fix);
      }
    }

    {
      let replacedText: string;
      try {
        replacedText = decodeURIComponent(text);
      } catch {
        replacedText = text;
      }
      if (replacedText !== text) {
        const fix = new vscode.CodeAction(
          vscode.l10n.t("URL-decode (Query Parameter Style)"),
          vscode.CodeActionKind.RefactorRewrite,
        );
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, range, replacedText);
        refactorings.push(fix);
      }
    }

    return refactorings;
  }

  /**
   * Provides source actions for the robots.txt document.
   * @param _document The text document for which to provide source actions.
   * @returns An array of code actions representing source actions for the given document.
   */
  private provideSourceActions(
    _document: vscode.TextDocument,
  ): vscode.CodeAction[] {
    return []; // TODO
  }

  /**
   * Generates a user-friendly message for a code action that replaces an invalid directive with a suggested valid directive based on similarity.
   * @param value The suggested valid directive to replace the invalid directive with.
   * @returns A localized message string for the code action title.
   */
  private getMessageReplaceWith(value: string): string {
    return vscode.l10n.t("Replace with '{0}'", value);
  }

  /**
   * Generates a user-friendly message for a code action that removes an invalid directive.
   * @param value The invalid directive to be removed.
   * @returns A localized message string for the code action title.
   */
  private getMessageRemoveInvalid(value: string): string {
    return vscode.l10n.t("Remove invalid '{0}'", value);
  }

  /**
   * Generates a user-friendly message for a code action that removes an unnecessary directive.
   * @param value The unnecessary directive to be removed.
   * @returns A localized message string for the code action title.
   */
  private getMessageRemoveUnnecessary(value: string): string {
    return vscode.l10n.t("Remove unnecessary '{0}'", value);
  }

  /**
   * Generates a user-friendly message for a code action that encodes invalid characters.
   * @param value The invalid characters to be encoded.
   * @returns A localized message string for the code action title.
   */
  private getMessageEncodeInvalid(value: string): string {
    return vscode.l10n.t("Encode invalid '{0}' characters", value);
  }

  /**
   * Generates a user-friendly message for a code action that inserts a directive.
   * @param directive The directive to be inserted.
   * @returns A localized message string for the code action title.
   */
  private getMessageInsertDirective(directive: string): string {
    return vscode.l10n.t("Insert '{0}' directive", directive);
  }
}
