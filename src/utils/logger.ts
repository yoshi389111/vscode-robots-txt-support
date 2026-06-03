import * as vscode from "vscode";

let output: vscode.LogOutputChannel | undefined = undefined;

export function initLogger(name: string): vscode.LogOutputChannel {
  if (!output) {
    output = vscode.window.createOutputChannel(name, {
      log: true,
    });
  }
  return output;
}

export function getLogger(): vscode.LogOutputChannel {
  if (!output) {
    throw new Error("Logger is not initialized. Call initLogger first.");
  }
  return output;
}
