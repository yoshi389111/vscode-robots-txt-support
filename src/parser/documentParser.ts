import * as vscode from "vscode";
import { parseLine, splitTokenWithLimit } from "./lineParser";
import { Span, isEmptySpan } from "./span";
import { DIRECTIVE_INFOS } from "../data/directiveInfo";

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

export interface AstGroup {
  userAgents: AstDirective[];
  rules: AstDirective[];
  startLine: number;
  endLine: number;
  /** Indicates whether the group has at least one rule */
  hasRule: boolean;
}

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
    const directiveInfo = DIRECTIVE_INFOS[type];

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
      if (currentGroup === astRoot.outside || currentGroup.hasRule) {
        currentGroup = createAstGroup();
        astRoot.groups.push(currentGroup);
        currentGroup.startLine = lineNo;
      }
      currentGroup.userAgents.push(astDirective);
      currentGroup.endLine = lineNo;
      continue;
    }

    currentGroup.hasRule = true;
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

function createAstGroup(): AstGroup {
  return {
    userAgents: [],
    rules: [],
    startLine: 0,
    endLine: 0,
    hasRule: false,
  };
}
