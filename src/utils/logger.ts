import * as vscode from "vscode";

/** The output channel for logging messages */
let output: vscode.LogOutputChannel | undefined = undefined;

/**
 * Initializes the logger for the extension.
 * This should be called once during activation.
 * @param name The name of the extension or the logger
 * @returns The initialized log output channel
 * @throws Error if the logger is already initialized
 */
export function initLogger(name: string): vscode.LogOutputChannel {
  if (output) {
    throw new Error("Logger is already initialized.");
  }
  output = vscode.window.createOutputChannel(name, {
    log: true,
  });
  return output;
}

/**
 * Retrieves the initialized logger output channel.
 * @returns The log output channel for logging messages
 * @throws Error if the logger has not been initialized yet
 */
export function getLogger(): vscode.LogOutputChannel {
  if (!output) {
    throw new Error("Logger is not initialized. Call initLogger first.");
  }
  return output;
}
