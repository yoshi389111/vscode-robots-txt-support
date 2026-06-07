import * as vscode from "vscode";
import { parseLine, splitTokenWithLimit } from "./lineParser";
import { Span, isEmptySpan } from "./span";
import { DIRECTIVE_LOOKUP } from "../data/directiveInfo";

/**
 * Defines the structure of a directive in the abstract syntax tree (AST) representation of a robots.txt file.
 */
export interface AstDirective {
  /** directive type. always lowercase */
  type: string;
  /** directive name */
  name: Span;
  /** separator, usually a colon (:) */
  separator: Span | undefined;
  /** directive value tokens */
  params: Span[];
  /** Comment */
  comment: Span | undefined;
}

/**
 * Defines the structure of a group in the abstract syntax tree (AST) representation of a robots.txt file.
 */
export interface AstGroup {
  userAgents: AstDirective[];
  rules: AstDirective[];
  startLine: number;
  endLine: number;
  /** Indicates whether the group has at least one directive */
  hasDirectives: boolean;
}

/**
 * Defines the structure of the root of the abstract syntax tree (AST) representation of a robots.txt file.
 */
export interface AstRoot {
  outside: AstGroup;
  groups: AstGroup[];
  globals: AstDirective[];
}

/**
 * Parses the given text document into an abstract syntax tree (AST) representation of the robots.txt file.
 * @param document The text document representing the robots.txt file to be parsed.
 * @returns An AST representation of the robots.txt file, including groups of directives and standalone directives.
 */
export function parseRobotsTxt(document: vscode.TextDocument): AstRoot {
  const astRoot: AstRoot = {
    outside: createAstGroup(),
    groups: [],
    globals: [],
  };

  let currentGroup: AstGroup = astRoot.outside;
  for (let lineNo = 0; lineNo < document.lineCount; lineNo++) {
    const lineText = document.lineAt(lineNo);
    const { name, separator, value, comment } = parseLine(lineText);

    if (isEmptySpan(name) && separator === undefined) {
      // empty line or comment-only line, just ignore
      continue;
    }

    const type = name.text.toLowerCase();
    const directiveInfo = DIRECTIVE_LOOKUP[type];

    const maxParts = directiveInfo ? directiveInfo.params.length : 1;
    const params = value ? splitTokenWithLimit(value, maxParts) : [];
    const astDirective: AstDirective = {
      type,
      name,
      separator,
      params,
      comment,
    };

    if (type === "user-agent") {
      if (currentGroup === astRoot.outside || currentGroup.hasDirectives) {
        currentGroup = createAstGroup();
        astRoot.groups.push(currentGroup);
        currentGroup.startLine = lineNo;
      }
      currentGroup.userAgents.push(astDirective);
      currentGroup.endLine = lineNo;
      continue;
    }

    currentGroup.hasDirectives = true;
    if (directiveInfo && directiveInfo.scope === "global") {
      // known global scoped directive
      astRoot.globals.push(astDirective);
    } else {
      // known user-agent scoped directive or unknown directive
      currentGroup.rules.push(astDirective);
      currentGroup.endLine = lineNo;
    }
  }
  return astRoot;
}

/**
 * Creates a new AST group with default values.
 * @returns A new AST group object initialized with empty user agents, rules, and line numbers set to 0.
 */
function createAstGroup(): AstGroup {
  return {
    userAgents: [],
    rules: [],
    startLine: 0,
    endLine: 0,
    hasDirectives: false,
  };
}
