import * as vscode from "vscode";
import { parseRobotsTxt, AstRoot } from "./parser/documentParser";
import { VersionAsyncCache } from "./utils/VersionAsyncCache";

/** Cache for storing parsed ASTs of `robots.txt` documents. */
const cache = new VersionAsyncCache<AstRoot>((document) =>
  parseRobotsTxt(document),
);

/**
 * Returns a disposable for the AST cache (created eagerly at module load time).
 * @returns Add this to `context.subscriptions` so cache listeners are disposed on deactivation.
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
