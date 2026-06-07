import * as vscode from "vscode";
import { parseRobotsTxt, AstRoot } from "./parser/documentParser";
import { VersionAsyncCache } from "./utils/VersionAsyncCache";

/** Cache for storing parsed ASTs of `robots.txt` documents. */
const cache = new VersionAsyncCache<AstRoot>((document) =>
  parseRobotsTxt(document),
);

/**
 * Initializes the `RobotsTxtAstAsyncCache` by setting up the necessary event listeners for cache invalidation.
 * @returns A disposable that can be used to clean up the event listeners when the cache is no longer needed.
 */
export function initialize(): vscode.Disposable {
  return cache;
}

/**
 * Retrieves the cached AST for the given document.
 * If the cache is valid, it returns the cached AST.
 * @param document The text document for which to retrieve the cached AST.
 * @returns A promise that resolves to the cached AST for the given document.
 */
export async function getAst(document: vscode.TextDocument): Promise<AstRoot> {
  return cache.get(document);
}
