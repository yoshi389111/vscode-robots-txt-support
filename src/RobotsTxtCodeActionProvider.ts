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
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
  };

  public provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
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
        context.only.contains(vscode.CodeActionKind.QuickFix)
      ) {
        // Provide quick fixes for diagnostics
        for (const diagnostic of context.diagnostics) {
          actions.push(...this.provideQuickFixes(document, diagnostic));
        }
      }

      if (
        !context.only ||
        context.only.contains(vscode.CodeActionKind.Refactor)
      ) {
        // Provide refactorings
        actions.push(...this.provideRefactorings(document));
      }

      if (
        !context.only ||
        context.only.contains(vscode.CodeActionKind.Source)
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

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_URL_ENCODING.code:
        return this.createPathPatternInvalidUrlEncodingFix(
          document,
          diagnostic,
        );

      case DIAGNOSTIC_LOOKUP.DIRECTIVE_UNKNOWN_SUGGESTION.code:
        return this.createUnknownDirectiveFix(document, diagnostic);

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
      "Remove leading zeros",
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
      "Insert missing ':'",
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
      "Insert leading '/'",
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
      "Replace '**' with '*'",
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
      "Remove unnecessary '*'",
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
      "Encode invalid '$' characters",
    );

    const removedString = targetString.replace(
      REGEX_DOLLAR_SIGN_NOT_AT_END,
      "",
    );
    const fixRemove = this.createReplaceFix(
      document,
      diagnostic,
      removedString,
      "Remove invalid '$' characters",
      false,
    );

    return [fixReplace, fixRemove];
  }

  /**
   * Creates a code action to encode or remove invalid '%' characters in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns An array of code actions representing quick fixes for the given diagnostic.
   */
  private createPathPatternInvalidUrlEncodingFix(
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
      "Encode invalid '%' characters",
    );

    const removedString = targetString.replace(REGEX_INVALID_URL_ENCODING, "");
    const fixRemove = this.createReplaceFix(
      document,
      diagnostic,
      removedString,
      "Remove invalid '%' characters",
      false,
    );

    return [fixReplace, fixRemove];
  }

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
      `Replace with '${suggestedDirective}'`,
      true,
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
   * Provides refactorings for the robots.txt document.
   * @param _document The text document for which to provide refactorings.
   * @returns An array of code actions representing refactorings for the given document.
   */
  private provideRefactorings(
    _document: vscode.TextDocument,
  ): vscode.CodeAction[] {
    return []; // TODO
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
}
