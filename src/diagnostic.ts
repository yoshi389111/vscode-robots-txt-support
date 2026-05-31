import * as vscode from "vscode";
import * as path from "path";
import { parseRobotsTxt } from "./parser";

const EXTENSION_NAME = "Robots.txt support";

const DIAGNOSTIC_INFO = {
  RBT001E: "The file name is not 'robots.txt'.",
  RBT002E: "The file encoding is not UTF-8.",
  RBT003W: "The file contains a UTF-8 BOM.",
  RBT004E: "The file size exceeds 500 KiB.",

  RBT101E: "The directive is missing a colon.",
  RBT102E:
    "The directive name is invalid. Directive names should consist of letters, digits, hyphens, and underscores only.",
  RBT103W: "The directive is unknown.",
  RBT104U: "The directive is defined outside of a group.",
  RBT105E:
    "The product token is invalid. Product tokens should consist of letters, hyphens, and underscores only or '*'.",
  RBT106E: "The group does not contains allow/disallow directives.",
  RBT107E: "The path pattern does not start with a slash.",
  RBT108W: "The wildcard is not necessary at the end of the path pattern.",
  RBT109W: "The '**' pattern is not necessary (use a single '*').",
  RBT110E: "The '$' character is only allowed at the end of the path pattern.",
  RBT111E:
    "The path pattern contains unencoded characters that should be URL-encoded.",

  RBT501E: "The directive value is not a valid URL.",
  RBT502D: "The directive is deprecated.",
  RBT503E: "The directive value is not a numeric.",
  RBT504W: "The directive value has leading zeros.",
  RBT505E: "The directive value is invalid.",
  RBT506E: "The directive value is not a valid domain.",
};

type DiagnosticCode = keyof typeof DIAGNOSTIC_INFO;

const KNOWN_INSIDE_DIRECTIVES = ["allow", "disallow", "crawl-delay"];
const REGEX_DIRECTIVE_NAME = /^[a-zA-Z]([a-zA-Z0-9_-]*[a-zA-Z])?$/;
const REGEX_PRODUCT_TOKEN = /^([a-zA-Z_-]+$|^\*)$/;

export async function collectDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
): Promise<void> {
  const diagnostics: vscode.Diagnostic[] = [];
  const addDiagnostic = (code: DiagnosticCode, range: vscode.Range) =>
    diagnostics.push(createDiagnostic(code, range));

  if (!isValidFileName(document)) {
    // The file name is not 'robots.txt'
    addDiagnostic("RBT001E", new vscode.Range(0, 0, 0, 0));
  }

  if (document.encoding === "utf8bom") {
    // The file contains a UTF-8 BOM
    addDiagnostic("RBT003W", new vscode.Range(0, 0, 0, 0));
  } else if (document.encoding !== "utf8") {
    // The file encoding is not UTF-8
    addDiagnostic("RBT002E", new vscode.Range(0, 0, 0, 0));
  }

  // Check for file size
  const isFileSizeValid = await isValidFileSize(document);
  if (!isFileSizeValid) {
    addDiagnostic("RBT004E", new vscode.Range(0, 0, 0, 0));
  }

  // parse the robots.txt file
  const astRoot = parseRobotsTxt(document);

  // Check for directives outside of groups
  for (const astDirective of astRoot.directives) {
    const directiveType = astDirective.type;
    const directiveValue = astDirective.value;

    if (!REGEX_DIRECTIVE_NAME.test(directiveType)) {
      // The directive name is invalid
      addDiagnostic("RBT102E", astDirective.name.range);
    }

    if (directiveValue === undefined) {
      // The directive is missing a colon
      addDiagnostic("RBT101E", astDirective.name.range);
      continue;
    }

    if (KNOWN_INSIDE_DIRECTIVES.includes(directiveType)) {
      // The directive is defined outside of a group
      addDiagnostic("RBT104U", astDirective.name.range);
    } else if (directiveType === "sitemap") {
      if (!isValidUri(directiveValue.text)) {
        // The directive value is not a valid URL
        addDiagnostic("RBT501E", directiveValue.range);
      }
    } else if (directiveType === "host") {
      // The directive is deprecated
      addDiagnostic("RBT502D", astDirective.name.range);
      if (!isValidDomain(directiveValue.text)) {
        // The directive value is not a valid domain
        addDiagnostic("RBT506E", directiveValue.range);
      }
    } else if (directiveType === "clean-param") {
      if (directiveValue.text.length === 0) {
        continue;
      }
      const params = directiveValue.text.split(/\s+/);
      if (2 < params.length) {
        // The directive value is invalid (too many parameters)
        addDiagnostic("RBT505E", directiveValue.range);
      } else if (!/^\w+(\&\w+)*$/.test(params[0]!)) {
        // The directive value is invalid (param#1)
        addDiagnostic("RBT505E", directiveValue.range);
      } else if (
        params.length === 2 &&
        !/^\/[-#%&*./0-9=?A-Z_a-z~]*\$?$/.test(params[1]!)
      ) {
        // The directive value is invalid (param#2)
        addDiagnostic("RBT505E", directiveValue.range);
      }
    }
  }

  for (const group of astRoot.groups) {
    for (const userAgent of group.userAgents) {
      const productToken = userAgent.value;
      if (productToken === undefined) {
        // The directive is missing a colon
        addDiagnostic("RBT101E", userAgent.name.range);
        continue;
      } else if (!REGEX_PRODUCT_TOKEN.test(productToken.text)) {
        // The product token is invalid
        addDiagnostic("RBT105E", productToken.range);
      }
    }

    let hasStandardRule = false;
    for (const rule of group.rules) {
      const directiveType = rule.type;
      const ruleNameRange = rule.name.range;
      const ruleParam = rule.value;

      if (ruleParam === undefined) {
        if (REGEX_DIRECTIVE_NAME.test(directiveType)) {
          // The directive is missing a colon
          addDiagnostic("RBT101E", ruleNameRange);
        } else {
          // The directive name is invalid
          addDiagnostic("RBT102E", ruleNameRange);
        }
        continue;
      }

      if (directiveType === "allow" || directiveType === "disallow") {
        hasStandardRule = true;
        if (ruleParam.text === "") {
          continue;
        }
        if (!/^[-#$%&*./0-9=?A-Z_a-z~]+$/.test(ruleParam.text)) {
          // The path pattern contains unencoded characters that should be URL-encoded
          addDiagnostic("RBT111E", ruleParam.range);
        }
        if (!ruleParam.text.startsWith("/")) {
          // The path pattern does not start with a slash
          addDiagnostic("RBT107E", ruleParam.range);
        }
        if (ruleParam.text.lastIndexOf("$", -2) !== -1) {
          // The '$' character is only allowed at the end of the path pattern
          addDiagnostic("RBT110E", ruleParam.range);
        }
        if (ruleParam.text.endsWith("*")) {
          // The wildcard is not necessary at the end of the path pattern
          addDiagnostic("RBT108W", ruleParam.range);
        }
        if (ruleParam.text.includes("**")) {
          // The '**' pattern is not necessary (use a single '*')
          addDiagnostic("RBT109W", ruleParam.range);
        }
      } else if (directiveType === "crawl-delay") {
        if (ruleParam.text === "") {
          continue;
        }
        if (!/^\d+$/.test(ruleParam.text)) {
          // The directive value is not a numeric
          addDiagnostic("RBT503E", ruleParam.range);
        }
        if (/^0+\d+$/.test(ruleParam.text)) {
          // The directive value has leading zeros
          addDiagnostic("RBT504W", ruleParam.range);
        }
      } else {
        // This directive is unknown
        addDiagnostic("RBT103W", ruleNameRange);
      }
    }
    if (!hasStandardRule) {
      // The group does not contains allow/disallow directives
      addDiagnostic("RBT106E", group.userAgents[0]!.name.range);
    }
  }

  collection.set(document.uri, diagnostics);
}

function isValidFileName(document: vscode.TextDocument): boolean {
  return path.basename(document.fileName) === "robots.txt";
}

async function isValidFileSize(
  document: vscode.TextDocument,
): Promise<boolean> {
  const stat = await vscode.workspace.fs.stat(document.uri);
  return stat.size <= 500 * 1024;
}

/**
 * Checks if the given URI is valid according to the rules for sitemap directive values.
 * @param uri The URI to validate.
 * @returns True if the URI is valid, false otherwise.
 */
function isValidUri(uri: string): boolean {
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

function isValidDomain(domain: string): boolean {
  if (domain.includes(" ")) {
    return false;
  }
  // A simple regex to validate domain names
  const domainRegex =
    /^[A-Za-z]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
  return domainRegex.test(domain);
}

function createDiagnostic(
  code: DiagnosticCode,
  range: vscode.Range,
): vscode.Diagnostic {
  const diagnostic: vscode.Diagnostic = {
    message: DIAGNOSTIC_INFO[code],
    range,
    severity: vscode.DiagnosticSeverity.Error,
    code,
    source: EXTENSION_NAME,
  };
  if (code.endsWith("W")) {
    diagnostic.severity = vscode.DiagnosticSeverity.Warning;
  } else if (code.endsWith("U")) {
    diagnostic.severity = vscode.DiagnosticSeverity.Warning;
    diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
  } else if (code.endsWith("D")) {
    diagnostic.severity = vscode.DiagnosticSeverity.Warning;
    diagnostic.tags = [vscode.DiagnosticTag.Deprecated];
  } else if (code.endsWith("I")) {
    diagnostic.severity = vscode.DiagnosticSeverity.Information;
  } else if (code.endsWith("H")) {
    diagnostic.severity = vscode.DiagnosticSeverity.Hint;
  }
  return diagnostic;
}
