import * as vscode from "vscode";

export interface DiagnosticInfo {
  code: string;
  severity: vscode.DiagnosticSeverity;
  tag?: vscode.DiagnosticTag;
  message: string;
}

export const DIAGNOSTIC_LOOKUP = {
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
  PATH_PATTERN_UNNECESSARY_WILDCARD: {
    code: "RBT108",
    severity: vscode.DiagnosticSeverity.Hint,
    message: "Unnecessary '*' at the end of the pattern.",
  },
  PATH_PATTERN_DOUBLE_ASTERISK: {
    code: "RBT109",
    severity: vscode.DiagnosticSeverity.Hint,
    message: "Unnecessary '**' (use a single '*').",
  },
  PATH_PATTERN_DOLLAR: {
    code: "RBT110",
    severity: vscode.DiagnosticSeverity.Error,
    message: "'$' is only allowed at the end of the pattern.",
  },
  PATH_PATTERN_INVALID_URL_CHARACTER: {
    code: "RBT111",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid URL characters.",
  },
  PATH_PATTERN_INVALID_URL_ENCODING: {
    code: "RBT112",
    severity: vscode.DiagnosticSeverity.Error,
    message: "Invalid URL encoding.",
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
} as const;
