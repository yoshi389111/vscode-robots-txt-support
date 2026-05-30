import * as vscode from "vscode";

export interface Token {
  text: string;
  range: vscode.Range;
}

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

interface ParsedLine {
  name?: Token;
  value?: Token;
  comment?: Token;
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

/**
 * Parses a line of the robots.txt file and extracts the directive, value, and comment.
 * @param line The line of the robots.txt file to parse.
 * @returns An object containing the parsed directive, value, and comment.
 */
function parseLine(line: vscode.TextLine): ParsedLine {
  const lineText = line.text;
  const lineNo = line.lineNumber;
  const result: ParsedLine = {};

  // comment
  const commentStart = lineText.indexOf("#");
  const hasComment = commentStart >= 0;
  if (hasComment) {
    const commentEnd = lineText.length;
    const text = lineText.substring(commentStart + 1);
    const range = new vscode.Range(lineNo, commentStart, lineNo, commentEnd);
    result.comment = { text, range };
  }

  const content = hasComment ? lineText.substring(0, commentStart) : lineText;
  if (content.trim().length === 0) {
    // empty line
    return result;
  }

  // directive name
  const nameStart = content.search(/\S/);
  const colonPos = content.indexOf(":");
  if (colonPos < 0) {
    // no colon, treat the whole line as directive (invalid but we can report diagnostics later)
    const text = content.trim().toLowerCase();
    const nameEnd = nameStart + text.length;
    const range = new vscode.Range(lineNo, nameStart, lineNo, nameEnd);
    result.name = { text, range };
    return result;
  } else {
    const text = content.substring(0, colonPos).trim();
    const nameEnd = nameStart + text.length;
    const range = new vscode.Range(lineNo, nameStart, lineNo, nameEnd);
    result.name = { text, range };
  }

  // directive value
  const valuePart = content.substring(colonPos + 1);
  const valueOffset = valuePart.search(/\S/);
  if (valueOffset >= 0) {
    const text = valuePart.trim();
    const valueStart = colonPos + 1 + valueOffset;
    const valueEnd = valueStart + text.length;
    const range = new vscode.Range(lineNo, valueStart, lineNo, valueEnd);
    result.value = { text, range };
  } else {
    const valueStart = colonPos + 1;
    const range = new vscode.Range(lineNo, valueStart, lineNo, valueStart);
    result.value = { text: "", range };
  }

  return result;
}
