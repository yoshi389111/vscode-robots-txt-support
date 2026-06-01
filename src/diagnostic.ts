import * as vscode from "vscode";
import * as path from "path";
import { parseRobotsTxt } from "./parser";
import { Token } from "./lineparser";

const EXTENSION_NAME = "Robots.txt support";

const KNOWN_INSIDE_DIRECTIVES = ["allow", "disallow", "crawl-delay"];
const REGEX_DIRECTIVE_NAME = /^[a-zA-Z]([a-zA-Z0-9_-]*[a-zA-Z])?$/;
const REGEX_PRODUCT_TOKEN = /^([a-zA-Z_-]+$|^\*)$/;
const REGEX_DOMAIN =
  /^[A-Za-z]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

interface DiagnosticInfo {
  code: string;
  severity: vscode.DiagnosticSeverity;
  tag?: vscode.DiagnosticTag;
  message: string;
}

const CODE = {
  FILENAME_INVALID: {
    code: "RBT001",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid file name. Expected 'robots.txt'.",
  },
  ENCODING_NOT_UTF8: {
    code: "RBT002",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid file encoding. Expected UTF-8.",
  },
  ENCODING_UTF8_BOM: {
    code: "RBT003",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "The file contains a UTF-8 BOM.",
  },
  FILESIZE_LARGE: {
    code: "RBT004",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Exceeds the recommended 500 KiB limit.",
  },

  DIRECTIVE_MISSING_COLON: {
    code: "RBT101",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Missing a colon.",
  },
  DIRECTIVE_NAME_INVALID: {
    code: "RBT102",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid directive name.",
  },
  DIRECTIVE_UNKNOWN: {
    code: "RBT103",
    severity: vscode.DiagnosticSeverity.Information,
    message: "Unknown directive.",
  },
  DIRECTIVE_OUTSIDE: {
    code: "RBT104",
    severity: vscode.DiagnosticSeverity.Warning,
    tag: vscode.DiagnosticTag.Unnecessary,
    message: "The directive is defined outside of a group.",
  },
  PRODUCT_TOKEN_INVALID: {
    code: "RBT105",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Invalid product token. Allowed: [A-Za-z_-] or single '*'",
  },
  GROUP_MISSING_ALLOW_DISALLOW: {
    code: "RBT106",
    severity: vscode.DiagnosticSeverity.Error,
    message: "No rules in the group.",
  },
  PATH_PATTERN_NOT_START_SLASH: {
    code: "RBT107",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Does not start with a slash.",
  },
  PATH_PATTERN_NECESSARY_WILDCARD: {
    code: "RBT108",
    severity: vscode.DiagnosticSeverity.Hint,
    message: "Unnecessary '*' at the end of the pattern.",
  },
  PATH_PATTERN_DOUBLE_ASTARISK: {
    code: "RBT109",
    severity: vscode.DiagnosticSeverity.Hint,
    message: "Unnecessary '**' (use a single '*').",
  },
  PATH_PATTERN_DOLLAR: {
    code: "RBT110",
    severity: vscode.DiagnosticSeverity.Error,
    message: "'$' is only allowed at the end of the pattern.",
  },
  PATH_PATTERN_INVALID_URLENCODE: {
    code: "RBT111",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid URL characters.",
  },

  URL_INVALID: {
    code: "RBT501",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid URL.",
  },
  DIRECTIVE_DEPRECATED: {
    code: "RBT502",
    severity: vscode.DiagnosticSeverity.Information,
    tag: vscode.DiagnosticTag.Deprecated,
    message: "Deprecated directive.",
  },
  NOT_NUMERIC: {
    code: "RBT503",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Value is not numeric.",
  },
  NUMBER_LEADING_ZERO: {
    code: "RBT504",
    severity: vscode.DiagnosticSeverity.Hint,
    message: "Consider removing leading zeros.",
  },
  PARAM_INVALID: {
    code: "RBT505",
    severity: vscode.DiagnosticSeverity.Warning,
    message: "Invalid directive value.",
  },
  DOMAIN_INVALID: {
    code: "RBT506",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid domain.",
  },
};

export async function collectDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
): Promise<void> {
  const diagnostics = new DiagnosticCollection();

  if (!isValidFileName(document)) {
    // The file name is not 'robots.txt'
    diagnostics.add(CODE.FILENAME_INVALID, new vscode.Range(0, 0, 0, 0));
  }

  if (document.encoding === "utf8bom") {
    // The file contains a UTF-8 BOM
    diagnostics.add(CODE.ENCODING_UTF8_BOM, new vscode.Range(0, 0, 0, 0));
  } else if (document.encoding !== "utf8") {
    // The file encoding is not UTF-8
    diagnostics.add(CODE.ENCODING_NOT_UTF8, new vscode.Range(0, 0, 0, 0));
  }

  // Check for file size
  const isFileSizeValid = await isValidFileSize(document);
  if (!isFileSizeValid) {
    diagnostics.add(CODE.FILESIZE_LARGE, new vscode.Range(0, 0, 0, 0));
  }

  // parse the robots.txt file
  const astRoot = parseRobotsTxt(document);

  // Check for directives outside of groups
  for (const astDirective of astRoot.directives) {
    const directiveType = astDirective.type;
    const valueToken = astDirective.valueToken;
    const nameToken = astDirective.nameToken;

    if (!REGEX_DIRECTIVE_NAME.test(directiveType)) {
      // The directive name is invalid
      diagnostics.add(CODE.DIRECTIVE_NAME_INVALID, nameToken.range);
    }

    if (valueToken === undefined) {
      // The directive is missing a colon
      diagnostics.add(CODE.DIRECTIVE_MISSING_COLON, nameToken.range);
      continue;
    }

    if (KNOWN_INSIDE_DIRECTIVES.includes(directiveType)) {
      // The directive is defined outside of a group
      diagnostics.add(CODE.DIRECTIVE_OUTSIDE, nameToken.range);
    } else if (directiveType === "sitemap") {
      if (!isValidUri(valueToken.text)) {
        // The directive value is not a valid URL
        diagnostics.add(CODE.URL_INVALID, valueToken.range);
      }
    } else if (directiveType === "host") {
      // The directive is deprecated
      diagnostics.add(CODE.DIRECTIVE_DEPRECATED, nameToken.range);
      if (!isValidDomain(valueToken.text)) {
        // The directive value is not a valid domain
        diagnostics.add(CODE.DOMAIN_INVALID, valueToken.range);
      }
    } else if (directiveType === "clean-param") {
      if (valueToken.text.length === 0) {
        continue;
      }
      const params = valueToken.text.split(/\s+/);
      if (2 < params.length) {
        // The directive value is invalid (too many parameters)
        diagnostics.add(CODE.PARAM_INVALID, valueToken.range);
      } else if (!/^\w+(\&\w+)*$/.test(params[0]!)) {
        // The directive value is invalid (param#1)
        diagnostics.add(CODE.PARAM_INVALID, valueToken.range);
      } else if (
        params.length === 2 &&
        !/^\/[-%&*./0-9=?A-Z_a-z~]*\$?$/.test(params[1]!)
      ) {
        // The directive value is invalid (param#2)
        diagnostics.add(CODE.PARAM_INVALID, valueToken.range);
      }
    }
  }

  for (const group of astRoot.groups) {
    for (const userAgent of group.userAgents) {
      const productToken = userAgent.valueToken;
      if (productToken === undefined) {
        // The directive is missing a colon
        diagnostics.add(
          CODE.DIRECTIVE_MISSING_COLON,
          userAgent.nameToken.range,
        );
        continue;
      } else if (!REGEX_PRODUCT_TOKEN.test(productToken.text)) {
        // The product token is invalid
        diagnostics.add(CODE.PRODUCT_TOKEN_INVALID, productToken.range);
      }
    }

    for (const rule of group.rules) {
      const directiveType = rule.type;
      const ruleNameRange = rule.nameToken.range;
      const paramToken = rule.valueToken;

      if (paramToken === undefined) {
        if (REGEX_DIRECTIVE_NAME.test(directiveType)) {
          // The directive is missing a colon
          diagnostics.add(CODE.DIRECTIVE_MISSING_COLON, ruleNameRange);
        } else {
          // The directive name is invalid
          diagnostics.add(CODE.DIRECTIVE_NAME_INVALID, ruleNameRange);
        }
        continue;
      }

      if (directiveType === "allow" || directiveType === "disallow") {
        if (paramToken.text === "") {
          continue;
        }
        checkPathPattern(diagnostics, paramToken);
      } else if (directiveType === "crawl-delay") {
        if (paramToken.text === "") {
          continue;
        }
        checkNumericToken(diagnostics, paramToken);
      } else {
        // This directive is unknown
        diagnostics.add(CODE.DIRECTIVE_UNKNOWN, ruleNameRange);
      }
    }

    const hasStandardRule = group.rules.some((rule) =>
      ["allow", "disallow"].includes(rule.type),
    );
    if (!hasStandardRule) {
      // The group does not contains allow/disallow directives
      diagnostics.add(
        CODE.GROUP_MISSING_ALLOW_DISALLOW,
        group.userAgents[0]!.nameToken.range,
      );
    }
  }

  collection.set(document.uri, diagnostics.getAll());
}

function checkPathPattern(
  diagnostics: DiagnosticCollection,
  paramToken: Token,
): void {
  if (paramToken.text === "") {
    return;
  }
  if (!/^[-$%&*./0-9=?A-Z_a-z~]+$/.test(paramToken.text)) {
    // The path pattern contains unencoded characters that should be URL-encoded
    diagnostics.add(CODE.PATH_PATTERN_INVALID_URLENCODE, paramToken.range);
  }
  if (!paramToken.text.startsWith("/")) {
    // The path pattern does not start with a slash
    diagnostics.add(CODE.PATH_PATTERN_NOT_START_SLASH, paramToken.range);
  }
  if (paramToken.text.lastIndexOf("$", -2) !== -1) {
    // The '$' character is only allowed at the end of the path pattern
    diagnostics.add(CODE.PATH_PATTERN_DOLLAR, paramToken.range);
  }
  if (paramToken.text.endsWith("*")) {
    // The wildcard is not necessary at the end of the path pattern
    diagnostics.add(CODE.PATH_PATTERN_NECESSARY_WILDCARD, paramToken.range);
  }
  if (paramToken.text.includes("**")) {
    // The '**' pattern is not necessary (use a single '*')
    diagnostics.add(CODE.PATH_PATTERN_DOUBLE_ASTARISK, paramToken.range);
  }
}

function checkNumericToken(
  diagnostics: DiagnosticCollection,
  paramToken: Token,
): void {
  if (!/^\d+$/.test(paramToken.text)) {
    // The directive value is not a numeric
    diagnostics.add(CODE.NOT_NUMERIC, paramToken.range);
  }
  if (/^0+\d+$/.test(paramToken.text)) {
    // The directive value has leading zeros
    diagnostics.add(CODE.NUMBER_LEADING_ZERO, paramToken.range);
  }
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

/**
 * Checks if the given domain is valid according to the rules for host directive values.
 * @param domain The domain to validate.
 * @returns True if the domain is valid, false otherwise.
 */
function isValidDomain(domain: string): boolean {
  return REGEX_DOMAIN.test(domain);
}

/**
 * A helper class to collect diagnostics during the validation process.
 * It allows adding diagnostics with specific information and retrieving all collected diagnostics at once.
 */
class DiagnosticCollection {
  /** The list of collected diagnostics. */
  private diagnostics: vscode.Diagnostic[] = [];

  /**
   * Adds a diagnostic to the collection based on the provided diagnostic information and range.
   * @param diagnosticInfo The information about the diagnostic to be added, including code, severity, message, and optional tag.
   * @param range The range in the document where the diagnostic should be applied.
   */
  public add(diagnosticInfo: DiagnosticInfo, range: vscode.Range): void {
    this.diagnostics.push(this.createDiagnostic(diagnosticInfo, range));
  }

  /**
   * Creates a vscode.Diagnostic object based on the provided diagnostic information and range.
   * @param dignosticInfo The information about the diagnostic, including code, severity, message, and optional tag.
   * @param range The range in the document where the diagnostic should be applied.
   * @returns A vscode.Diagnostic object representing the diagnostic to be added to the collection.
   */
  private createDiagnostic(
    dignosticInfo: DiagnosticInfo,
    range: vscode.Range,
  ): vscode.Diagnostic {
    const diagnostic: vscode.Diagnostic = {
      message: dignosticInfo.message,
      range,
      severity: dignosticInfo.severity,
      code: dignosticInfo.code,
      source: EXTENSION_NAME,
    };
    if (dignosticInfo.tag) {
      diagnostic.tags = [dignosticInfo.tag];
    }
    return diagnostic;
  }

  /**
   * Retrieves all collected diagnostics in the collection.
   * @returns An array of vscode.Diagnostic objects representing all diagnostics collected in the collection.
   */
  public getAll(): vscode.Diagnostic[] {
    return this.diagnostics;
  }
}
