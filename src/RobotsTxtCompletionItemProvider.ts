import * as vscode from "vscode";
import { CRAWLER_LOOKUP } from "./data/crawlerInfo";
import { DIRECTIVE_LOOKUP, ParameterInfo } from "./data/directiveInfo";
import {
  parseLine,
  ParsedLine,
  splitTokenWithLimit,
} from "./parser/lineParser";
import { isEmptySpan, Span, subspan } from "./parser/span";
import { getLogger } from "./utils/logger";

/** Completion item provider for `robots.txt` files. */
export class RobotsTxtCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  /** The logger instance. */
  private readonly log = getLogger();

  /**
   * Provides completion items for the given position in the document.
   * @param document The text document in which the command was invoked.
   * @param position The position at which the command was invoked.
   * @param _token A cancellation token.
   * @param _context Additional context for the completion request.
   * @returns A list of completion items or undefined if no completion is available for the given context.
   */
  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext,
  ): Promise<vscode.CompletionItem[] | undefined> {
    this.log.trace("Providing completion items", document.fileName);
    try {
      const parsedLine = parseLine(document.lineAt(position.line));

      if (
        parsedLine.comment &&
        position.isAfterOrEqual(parsedLine.comment.range.start)
      ) {
        // in comment part, no completion
        return undefined;
      }

      if (
        parsedLine.separator &&
        position.isEqual(parsedLine.separator.range.start)
      ) {
        // in separator part, no completion
        return undefined;
      }

      if (
        !parsedLine.separator ||
        position.isBefore(parsedLine.separator.range.start)
      ) {
        // before separator, complete directive name
        return this.provideCompletionDirectiveName(
          document,
          parsedLine,
          position,
        );
      } else {
        // after separator, complete directive value
        return await this.provideCompletionDirectiveValue(
          document,
          parsedLine,
          position,
        );
      }
    } catch (error) {
      this.log.error("Error providing completion items:", error);
      return undefined;
    } finally {
      this.log.trace("Finished providing completion items");
    }
  }

  /**
   * Provides completion items for directive names based on the current position in the line.
   * @param _document The text document in which the command was invoked.
   * @param parsedLine The parsed line containing the directive and its components.
   * @param position The position at which the command was invoked.
   * @returns A list of completion items for directive names, or an empty list if no completion is available for the given context.
   */
  private provideCompletionDirectiveName(
    _document: vscode.TextDocument,
    parsedLine: ParsedLine,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    this.log.trace("> Providing completion for directive name", parsedLine);
    try {
      const { name, separator, value } = parsedLine;

      if (!name.range.contains(position) && !isEmptySpan(name)) {
        // if the position is not in the name part and name part is not empty, no completion
        return [];
      }

      const suggestionSegment: Span = name.range.contains(position)
        ? name
        : { text: "", range: new vscode.Range(position, position) };

      const inputLength =
        position.character - suggestionSegment.range.start.character;
      const lowercaseInputSegment = suggestionSegment.text
        .substring(0, inputLength)
        .toLowerCase();

      const targetCompletionRange = value
        ? new vscode.Range(suggestionSegment.range.start, value.range.start)
        : separator
          ? new vscode.Range(suggestionSegment.range.start, separator.range.end)
          : suggestionSegment.range;

      return Object.entries(DIRECTIVE_LOOKUP)
        .filter(([key, _]) => key.startsWith(lowercaseInputSegment))
        .filter(([_, info]) => !info.hiddenCompletion)
        .map(([_, info]) =>
          this.newCompletion(
            `${info.name}: `,
            targetCompletionRange,
            vscode.CompletionItemKind.Keyword,
          ),
        );
    } finally {
      this.log.trace("< Finished providing completion for directive name");
    }
  }

  /**
   * Provides completion items for directive values based on the current position in the line and the directive's parameters.
   * @param document The text document in which the command was invoked.
   * @param parsedLine The parsed line containing the directive and its components.
   * @param position The position at which the command was invoked.
   * @returns A list of completion items for directive values, or undefined if no completion is available for the given context.
   */
  private async provideCompletionDirectiveValue(
    document: vscode.TextDocument,
    parsedLine: ParsedLine,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[] | undefined> {
    this.log.trace("> Providing completion for directive value");

    try {
      if (
        !parsedLine.separator ||
        parsedLine.separator.range.end.isAfterOrEqual(position)
      ) {
        // before separator, no completion
        return undefined;
      }

      const directiveName = parsedLine.name.text.toLowerCase();
      const directiveInfo = DIRECTIVE_LOOKUP[directiveName];
      if (!directiveInfo) {
        // unknown directive, no completion
        return undefined;
      }

      const firstParamInfo = directiveInfo.params[0];

      if (!firstParamInfo) {
        // if directive has no parameter, no completion
        return undefined;
      }

      const cursorSpan: Span = {
        text: "",
        range: new vscode.Range(position, position),
      };

      const value = parsedLine.value;
      if (!value) {
        return await this.provideCompletionParameter(
          document,
          cursorSpan,
          firstParamInfo,
          position,
        );
      }

      const paramSpans = splitTokenWithLimit(
        value,
        directiveInfo.params.length,
      );
      if (paramSpans.length === 0) {
        // if value is empty but directive has parameters, suggest the first parameter
        return await this.provideCompletionParameter(
          document,
          cursorSpan,
          firstParamInfo,
          position,
        );
      }

      if (
        paramSpans.length < directiveInfo.params.length &&
        position.isAfter(paramSpans[paramSpans.length - 1]!.range.end)
      ) {
        // if not all parameters are present, suggest the next parameter
        const nextParamInfo = directiveInfo.params[paramSpans.length]!;
        return await this.provideCompletionParameter(
          document,
          cursorSpan,
          nextParamInfo,
          position,
        );
      }

      for (const [index, paramSpan] of paramSpans.entries()) {
        const paramInfo = directiveInfo.params[index]!;
        if (!paramInfo) {
          break;
        }
        if (paramSpan.range.contains(position)) {
          return await this.provideCompletionParameter(
            document,
            paramSpan,
            paramInfo,
            position,
          );
        }
      }

      return undefined;
    } finally {
      this.log.trace("< Finished providing completion for directive value");
    }
  }

  /**
   * Provides completion items for a specific directive parameter.
   * @param document The text document in which the command was invoked.
   * @param paramSpan The span representing the parameter for which completion is being provided.
   * @param parameterInfo The information about the parameter.
   * @param position The position at which the command was invoked.
   * @returns A list of completion items for the parameter, or undefined if no completion is available for the given context.
   */
  private async provideCompletionParameter(
    document: vscode.TextDocument,
    paramSpan: Span,
    parameterInfo: ParameterInfo,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[] | undefined> {
    this.log.trace(">> Providing completion for parameter", parameterInfo);
    try {
      switch (parameterInfo.validationType) {
        case "no-check":
        case "number":
        case "query-params":
          return undefined;

        case "product-token":
          return this.provideCompletionProductToken(paramSpan, position);

        case "path-pattern":
          return await this.provideCompletionPath(
            document,
            paramSpan,
            position,
          );

        case "url":
          return await this.provideCompletionUrl(document, paramSpan, position);
      }
    } finally {
      this.log.trace("<< Finished providing completion for parameter");
    }
  }

  /**
   * Provides completion items for product tokens based on the current input and position.
   * @param value The span representing the current value of the parameter for which completion is being provided.
   * @param position The position at which the command was invoked.
   * @returns A list of completion items for the product token, or undefined if no completion is available for the given context.
   */
  private provideCompletionProductToken(
    value: Span,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    this.log.trace(">>> Providing completion for product token", value);
    try {
      const inputLength = position.character - value.range.start.character;
      const inputPrefix = value.text.substring(0, inputLength).toLowerCase();
      return Object.entries(CRAWLER_LOOKUP)
        .filter(([key, _]) => key.startsWith(inputPrefix))
        .filter(([_, info]) => !info.hiddenCompletion)
        .filter(([key, _]) => key !== inputPrefix)
        .filter(
          ([_, info]) => !info.prefix || inputPrefix.startsWith(info.prefix),
        )
        .map(([_, info]) =>
          this.newCompletion(
            info.name,
            value.range,
            vscode.CompletionItemKind.Value,
          ),
        );
    } finally {
      this.log.trace("<<< Finished providing completion for product token");
    }
  }

  /**
   * Provides completion items for path patterns based on the current input and position.
   * @param document The text document in which the command was invoked.
   * @param paramSpan The span representing the current value of the parameter for which completion is being provided.
   * @param position The position at which the command was invoked.
   * @returns A list of completion items for path patterns, or undefined if no completion is available for the given context.
   */
  private async provideCompletionPath(
    document: vscode.TextDocument,
    paramSpan: Span,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[] | undefined> {
    this.log.trace(">>> Providing completion for path pattern", paramSpan);
    try {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) {
        return undefined;
      }

      if (!paramSpan.range.end.isEqual(position)) {
        return undefined;
      }

      if (paramSpan.text.includes("*") || paramSpan.text.includes("$")) {
        return undefined;
      }

      const basePath = paramSpan.text.startsWith("/")
        ? paramSpan.text.substring(1)
        : paramSpan.text;

      const basePathDirLength = basePath.lastIndexOf("/") + 1;
      const basePathDir = basePath.substring(0, basePathDirLength);
      const prefix = basePath.substring(basePathDirLength);

      const baseDir = vscode.Uri.joinPath(workspaceFolder.uri, basePathDir);
      const entries = await this.readDirectory(baseDir);
      const result: vscode.CompletionItem[] = [];
      for (const [name, type] of entries) {
        if (!name.startsWith(prefix)) {
          continue;
        }
        if (type === vscode.FileType.Directory) {
          const completionItem = this.newCompletion(
            `/${basePathDir}${name}/`,
            paramSpan.range,
            vscode.CompletionItemKind.Folder,
          );
          result.push(completionItem);
        } else if (type === vscode.FileType.File) {
          const completionItem = this.newCompletion(
            `/${basePathDir}${name}`,
            paramSpan.range,
            vscode.CompletionItemKind.File,
          );
          result.push(completionItem);
        }
      }
      return result;
    } finally {
      this.log.trace("<<< Finished providing completion for path pattern");
    }
  }

  /**
   * Provides completion items for URLs based on the current input and position.
   * @param document The text document in which the command was invoked.
   * @param paramSpan The span representing the current value of the parameter for which completion is being provided.
   * @param position The position at which the command was invoked.
   * @returns A list of completion items for URLs, or undefined if no completion is available for the given context.
   */
  private async provideCompletionUrl(
    document: vscode.TextDocument,
    paramSpan: Span,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[] | undefined> {
    this.log.trace(">>> Providing completion for URL", paramSpan);
    try {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) {
        return undefined;
      }

      if (!paramSpan.range.end.isEqual(position)) {
        return undefined;
      }

      const match = paramSpan.text.match(/^https?:\/\/[^/]+\//);
      if (!match) {
        // if the value does not look like a URL with path, no completion
        return undefined;
      }
      const baseSpan = subspan(
        paramSpan,
        match[0].length,
        paramSpan.text.length,
      );
      const basePath = baseSpan.text;

      const basePathDirLength = basePath.lastIndexOf("/") + 1;
      const basePathDir = basePath.substring(0, basePathDirLength);
      const prefix = basePath.substring(basePathDirLength);

      const baseDir = vscode.Uri.joinPath(workspaceFolder.uri, basePathDir);

      const entries = await this.readDirectory(baseDir);
      const result: vscode.CompletionItem[] = [];
      for (const [name, type] of entries) {
        if (!name.startsWith(prefix)) {
          continue;
        }
        const resultPath =
          type === vscode.FileType.Directory
            ? `${basePathDir}${name}/`
            : `${basePathDir}${name}`;
        const completionItem = this.newCompletion(
          resultPath,
          baseSpan.range,
          vscode.CompletionItemKind.Value,
        );
        result.push(completionItem);
      }
      return result;
    } finally {
      this.log.trace("<<< Finished providing completion for URL");
    }
  }

  /**
   * Reads the contents of a directory and returns a list of entries with their types.
   * @param uri The URI of the directory to read.
   * @returns A promise that resolves to a list of entries in the directory.
   */
  private async readDirectory(
    uri: vscode.Uri,
  ): Promise<[string, vscode.FileType][]> {
    try {
      return await vscode.workspace.fs.readDirectory(uri);
    } catch (error) {
      // if error occurs (e.g. file not found), return empty list to avoid breaking completion
      this.log.debug("Error reading directory for completion", error);
      return [];
    }
  }

  /**
   * Creates a new completion item for a specific kind.
   * @param label The label of the completion item.
   * @param range The range in the document where the completion item applies.
   * @param itemKind The kind of the completion item.
   * @returns A new completion item.
   */
  private newCompletion(
    label: string,
    range: vscode.Range,
    itemKind: vscode.CompletionItemKind,
  ): vscode.CompletionItem {
    const item = new vscode.CompletionItem(label, itemKind);
    item.range = range;
    return item;
  }
}
