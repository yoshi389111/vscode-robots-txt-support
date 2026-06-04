import * as vscode from "vscode";
import { getLogger } from "./utils/logger";
import { DIAGNOSTIC_LOOKUP } from "./data/diagnostics";

export class RobotsTxtCodeActionProvider implements vscode.CodeActionProvider {
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
        return [this.createLeadingZerosRemovalFix(document, diagnostic)];

      case DIAGNOSTIC_LOOKUP.DIRECTIVE_MISSING_COLON.code:
        return [this.createMissingColonFix(document, diagnostic)];

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_NOT_START_SLASH.code:
        return [this.createPathPatternNotStartSlashFix(document, diagnostic)];

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOUBLE_ASTERISK.code:
        return [this.createPathPatternDoubleAsteriskFix(document, diagnostic)];

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_UNNECESSARY_WILDCARD.code:
        return [
          this.createPathPatternUnnecessaryWildcardFix(document, diagnostic),
        ];

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_DOLLAR.code:
        return [this.createPathPatternDollarFix(document, diagnostic)];

      case DIAGNOSTIC_LOOKUP.PATH_PATTERN_INVALID_URL_ENCODING.code:
        return this.createPathPatternInvalidUrlEncodingFix(
          document,
          diagnostic,
        );

      default:
        return [];
    }
  }

  /**
   * Creates a code action to remove leading zeros from a numeric value.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns A code action.
   */
  private createLeadingZerosRemovalFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const REGEX_LEADING_ZEROS = /^0+(?!$)/;
    const normalizedString = document
      .getText(diagnostic.range)
      .replace(REGEX_LEADING_ZEROS, "");
    const fix = new vscode.CodeAction(
      "Remove leading zeros",
      vscode.CodeActionKind.QuickFix,
    );
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(document.uri, diagnostic.range, normalizedString);
    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;
    return fix;
  }

  /**
   * Creates a code action to insert a missing colon in a directive.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns A code action.
   */
  private createMissingColonFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      "Insert missing ':'",
      vscode.CodeActionKind.QuickFix,
    );
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.insert(document.uri, diagnostic.range.end, ": ");
    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;
    return fix;
  }

  /**
   * Creates a code action to insert a leading slash in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns A code action.
   */
  private createPathPatternNotStartSlashFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(
      "Insert leading '/'",
      vscode.CodeActionKind.QuickFix,
    );
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.insert(document.uri, diagnostic.range.start, "/");
    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;
    return fix;
  }

  /**
   * Creates a code action to replace double asterisks with a single asterisk in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns A code action.
   */
  private createPathPatternDoubleAsteriskFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const REGEX_DOUBLE_ASTERISK = /\*\*+/g;
    const cleanedString = document
      .getText(diagnostic.range)
      .replace(REGEX_DOUBLE_ASTERISK, "*");

    const fix = new vscode.CodeAction(
      "Replace '**' with '*'",
      vscode.CodeActionKind.QuickFix,
    );
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(document.uri, diagnostic.range, cleanedString);
    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;
    return fix;
  }

  /**
   * Creates a code action to remove unnecessary wildcards at the end of a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns A code action.
   */
  private createPathPatternUnnecessaryWildcardFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const REGEX_TRAILING_ASTERISKS = /\*+$/;
    const cleanedString = document
      .getText(diagnostic.range)
      .replace(REGEX_TRAILING_ASTERISKS, "");

    const fix = new vscode.CodeAction(
      "Remove unnecessary '*'",
      vscode.CodeActionKind.QuickFix,
    );
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(document.uri, diagnostic.range, cleanedString);
    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;
    return fix;
  }

  /**
   * Creates a code action to remove or encode the '$' character in a path pattern.
   * @param document The text document containing the diagnostic.
   * @param diagnostic The diagnostic indicating the issue.
   * @returns A code action.
   */
  private createPathPatternDollarFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction {
    const REGEX_DOLLAR_SIGN_NOT_AT_END = /\$(?=.)/g;
    const cleanedString = document
      .getText(diagnostic.range)
      .replace(REGEX_DOLLAR_SIGN_NOT_AT_END, "%24");

    const fix = new vscode.CodeAction(
      "Encode invalid '$' characters",
      vscode.CodeActionKind.QuickFix,
    );
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.replace(document.uri, diagnostic.range, cleanedString);
    fix.diagnostics = [diagnostic];
    fix.isPreferred = true;
    return fix;
  }

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
    const fixReplace = new vscode.CodeAction(
      "Encode invalid '%' characters",
      vscode.CodeActionKind.QuickFix,
    );
    fixReplace.edit = new vscode.WorkspaceEdit();
    fixReplace.edit.replace(document.uri, diagnostic.range, replacedString);
    fixReplace.diagnostics = [diagnostic];
    fixReplace.isPreferred = true;

    const removedString = targetString.replace(REGEX_INVALID_URL_ENCODING, "");
    const fixRemove = new vscode.CodeAction(
      "Remove invalid '%' characters",
      vscode.CodeActionKind.QuickFix,
    );
    fixRemove.edit = new vscode.WorkspaceEdit();
    fixRemove.edit.replace(document.uri, diagnostic.range, removedString);
    fixRemove.diagnostics = [diagnostic];
    fixRemove.isPreferred = true;

    return [fixReplace, fixRemove];
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
