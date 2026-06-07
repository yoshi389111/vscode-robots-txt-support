import * as vscode from "vscode";

/**
 * A cache that stores asynchronous data associated with a document's version.
 * The cache automatically invalidates entries when the document is closed, renamed, or deleted.
 * If the document's version changes while the data is being created, the cache entry will be invalidated and an error will be thrown.
 */
export class VersionAsyncCache<V> implements vscode.Disposable {
  /** A map that stores the cached values along with their document versions. */
  private readonly cache: Map<string, { version: number; value: Promise<V> }>;
  /** An array of disposables for cleaning up resources when the cache is disposed. */
  private readonly disposables: vscode.Disposable[] = [];
  /** A function that creates the data for a given document. */
  private readonly createDataAsync: (document: vscode.TextDocument) => V;

  /**
   * Creates a new VersionAsyncCache.
   * @param createDataAsync A function that creates the data for a given document.
   */
  constructor(createDataAsync: (document: vscode.TextDocument) => V) {
    this.cache = new Map();
    this.createDataAsync = createDataAsync;

    vscode.workspace.onDidCloseTextDocument(
      (document) => this.deleteByUrl(document.uri),
      null,
      this.disposables,
    );

    vscode.workspace.onDidRenameFiles(
      (event) => {
        event.files.forEach((file) => this.deleteByUrl(file.oldUri));
      },
      null,
      this.disposables,
    );

    vscode.workspace.onDidDeleteFiles(
      (event) => {
        event.files.forEach((file) => this.deleteByUrl(file));
      },
      null,
      this.disposables,
    );
  }

  /**
   * Gets the cached value for the given document.
   * If the cache is valid, it returns the cached value.
   * Otherwise, it creates a new value using the provided function and caches it.
   * @param document The document for which to get the cached value.
   * @returns A promise that resolves to the cached value.
   */
  public async get(document: vscode.TextDocument): Promise<V> {
    const key = document.uri.toString();
    const version = document.version;
    const cached = this.cache.get(key);
    if (cached && cached.version === version) {
      return cached.value;
    }
    const promise = Promise.resolve(this.createDataAsync(document))
      .then((value) => {
        if (document.version !== version) {
          throw new Error("Document version has changed during data creation.");
        }
        return value;
      })
      .catch((error) => {
        this.deleteByUrlAndVersion(document.uri, version);
        throw error;
      });
    this.cache.set(key, { version, value: promise });
    return promise;
  }

  /**
   * Deletes the cached value for the given URL.
   * @param url The URL of the document for which to delete the cached value.
   */
  private deleteByUrl(url: vscode.Uri): void {
    const key = url.toString();
    this.cache.delete(key);
  }

  /**
   * Deletes the cached value for the given URL and version.
   * This is used to ensure that only the cache entry corresponding to the specific version is deleted, preventing race conditions.
   * @param url The URL of the document for which to delete the cached value.
   * @param version The version of the document for which to delete the cached value.
   */
  private deleteByUrlAndVersion(url: vscode.Uri, version: number): void {
    const key = url.toString();
    const cached = this.cache.get(key);
    if (cached && cached.version === version) {
      this.cache.delete(key);
    }
  }

  /**
   * Clears all entries from the cache.
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Disposes of the cache and all associated resources.
   */
  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
    this.cache.clear();
  }
}
