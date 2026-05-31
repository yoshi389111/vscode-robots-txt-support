import * as vscode from "vscode";
import { parseLine, Token } from "./lineparser";

export interface AstDirective {
  /** directive type. always lowercase */
  type: string;
  /** directive name */
  name: Token;
  /** directive value, or undefined if not exists colon */
  value: Token | undefined;
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
  groups: AstGroup[];
  directives: AstDirective[];
}

/**
 * Parses the given text document into an abstract syntax tree (AST) representation of the robots.txt file.
 * @param document The text document representing the robots.txt file to be parsed.
 * @returns An AST representation of the robots.txt file, including groups of directives and standalone directives.
 */
export function parseRobotsTxt(document: vscode.TextDocument): AstRoot {
  const astRoot: AstRoot = {
    groups: [],
    directives: [],
  };
  let currentAstGroup: AstGroup | null = null;

  for (let lineNo = 0; lineNo < document.lineCount; lineNo++) {
    const textLine = document.lineAt(lineNo);
    const parsedLine = parseLine(textLine);
    const parsedDirective = parsedLine.name;
    if (parsedDirective === undefined) {
      // empty line or comment-only line, just ignore
      continue;
    }

    const directiveType = parsedDirective.text.toLowerCase();
    const astDirective: AstDirective = {
      type: directiveType,
      name: parsedDirective,
      value: parsedLine.value,
    };

    switch (directiveType) {
      case "user-agent":
        if (currentAstGroup === null || currentAstGroup.hasRule) {
          // start a new group
          currentAstGroup = {
            userAgents: [astDirective],
            rules: [],
            startLine: lineNo,
            endLine: lineNo,
            hasRule: false,
          };
          astRoot.groups.push(currentAstGroup);
        } else {
          // continuation of the current group
          currentAstGroup.userAgents.push(astDirective);
          currentAstGroup.endLine = lineNo;
        }
        break;

      case "allow":
      case "disallow":
      case "crawl-delay":
        if (currentAstGroup === null) {
          // directive without a user-agent
          astRoot.directives.push(astDirective);
        } else {
          currentAstGroup.rules.push(astDirective);
          currentAstGroup.endLine = lineNo;
          currentAstGroup.hasRule = true;
        }
        break;

      case "sitemap":
      case "host":
      case "clean-param":
      default:
        // known directives that can appear outside of any group, we put them in the root level
        astRoot.directives.push(astDirective);
        if (currentAstGroup !== null) {
          currentAstGroup.hasRule = true;
        }
        break;
    }
  }
  return astRoot;
}
