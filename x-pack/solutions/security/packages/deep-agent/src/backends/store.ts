/**
 * StoreBackend: Adapter for LangGraph's BaseStore (persistent, cross-thread).
 */

import type { Item } from "@langchain/langgraph";
import type {
  BackendProtocol,
  EditResult,
  FileData,
  FileInfo,
  GrepMatch,
  StateAndStore,
  WriteResult,
} from "./protocol";
import {
  createFileData,
  fileDataToString,
  formatReadResponse,
  globSearchFiles,
  grepMatchesFromFiles,
  performStringReplacement,
  updateFileData,
} from "./utils";

/**
 * Backend that stores files in LangGraph's BaseStore (persistent).
 *
 * Uses LangGraph's Store for persistent, cross-conversation storage.
 * Files are organized via namespaces and persist across all threads.
 *
 * The namespace can include an optional assistant_id for multi-agent isolation.
 */
export class StoreBackend implements BackendProtocol {
  private stateAndStore: StateAndStore;

  constructor(stateAndStore: StateAndStore) {
    this.stateAndStore = stateAndStore;
  }

  /**
   * Get the store instance.
   *
   * @returns BaseStore instance
   * @throws Error if no store is available
   */
  private getStore() {
    const store = this.stateAndStore.store;
    if (!store) {
      throw new Error("Store is required but not available in StateAndStore");
    }
    return store;
  }

  /**
   * Get the namespace for store operations.
   *
   * If an assistant_id is available in stateAndStore, return
   * [assistant_id, "filesystem"] to provide per-assistant isolation.
   * Otherwise return ["filesystem"].
   */
  private getNamespace(): string[] {
    const namespace = "filesystem";
    const assistantId = this.stateAndStore.assistantId;

    if (assistantId) {
      return [assistantId, namespace];
    }

    return [namespace];
  }

  /**
   * Convert a store Item to FileData format.
   *
   * @param storeItem - The store Item containing file data
   * @returns FileData object
   * @throws Error if required fields are missing or have incorrect types
   */
  private convertStoreItemToFileData(storeItem: Item): FileData {
    const value = storeItem.value as any;

    if (
      !value.content ||
      !Array.isArray(value.content) ||
      typeof value.created_at !== "string" ||
      typeof value.modified_at !== "string"
    ) {
      throw new Error(
        `Store item does not contain valid FileData fields. Got keys: ${Object.keys(value).join(", ")}`,
      );
    }

    return {
      content: value.content,
      created_at: value.created_at,
      modified_at: value.modified_at,
    };
  }

  /**
   * Convert FileData to a value suitable for store.put().
   *
   * @param fileData - The FileData to convert
   * @returns Object with content, created_at, and modified_at fields
   */
  private convertFileDataToStoreValue(fileData: FileData): Record<string, any> {
    return {
      content: fileData.content,
      created_at: fileData.created_at,
      modified_at: fileData.modified_at,
    };
  }

  /**
   * Search store with automatic pagination to retrieve all results.
   *
   * @param store - The store to search
   * @param namespace - Hierarchical path prefix to search within
   * @param options - Optional query, filter, and page_size
   * @returns List of all items matching the search criteria
   */
  private async searchStorePaginated(
    store: any,
    namespace: string[],
    options: {
      query?: string;
      filter?: Record<string, any>;
      pageSize?: number;
    } = {},
  ): Promise<Item[]> {
    const { query, filter, pageSize = 100 } = options;
    const allItems: Item[] = [];
    let offset = 0;

    while (true) {
      const pageItems = await store.search(namespace, {
        query,
        filter,
        limit: pageSize,
        offset,
      });

      if (!pageItems || pageItems.length === 0) {
        break;
      }

      allItems.push(...pageItems);

      if (pageItems.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return allItems;
  }

  /**
   * List files and directories in the specified directory (non-recursive).
   *
   * @param path - Absolute path to directory
   * @returns List of FileInfo objects for files and directories directly in the directory.
   *          Directories have a trailing / in their path and is_dir=true.
   */
  async lsInfo(path: string): Promise<FileInfo[]> {
    const store = this.getStore();
    const namespace = this.getNamespace();

    // Retrieve all items and filter by path prefix locally to avoid
    // coupling to store-specific filter semantics
    const items = await this.searchStorePaginated(store, namespace);
    const infos: FileInfo[] = [];
    const subdirs = new Set<string>();

    // Normalize path to have trailing slash for proper prefix matching
    const normalizedPath = path.endsWith("/") ? path : path + "/";

    for (const item of items) {
      const itemKey = String(item.key);

      // Check if file is in the specified directory or a subdirectory
      if (!itemKey.startsWith(normalizedPath)) {
        continue;
      }

      // Get the relative path after the directory
      const relative = itemKey.substring(normalizedPath.length);

      // If relative path contains '/', it's in a subdirectory
      if (relative.includes("/")) {
        // Extract the immediate subdirectory name
        const subdirName = relative.split("/")[0];
        subdirs.add(normalizedPath + subdirName + "/");
        continue;
      }

      // This is a file directly in the current directory
      try {
        const fd = this.convertStoreItemToFileData(item);
        const size = fd.content.join("\n").length;
        infos.push({
          path: itemKey,
          is_dir: false,
          size: size,
          modified_at: fd.modified_at,
        });
      } catch {
        // Skip invalid items
        continue;
      }
    }

    // Add directories to the results
    for (const subdir of Array.from(subdirs).sort()) {
      infos.push({
        path: subdir,
        is_dir: true,
        size: 0,
        modified_at: "",
      });
    }

    infos.sort((a, b) => a.path.localeCompare(b.path));
    return infos;
  }

  /**
   * Read file content with line numbers.
   *
   * @param filePath - Absolute file path
   * @param offset - Line offset to start reading from (0-indexed)
   * @param limit - Maximum number of lines to read
   * @returns Formatted file content with line numbers, or error message
   */
  async read(
    filePath: string,
    offset: number = 0,
    limit: number = 2000,
  ): Promise<string> {
    const store = this.getStore();
    const namespace = this.getNamespace();
    const item = await store.get(namespace, filePath);

    if (!item) {
      return `Error: File '${filePath}' not found`;
    }

    try {
      const fileData = this.convertStoreItemToFileData(item);
      return formatReadResponse(fileData, offset, limit);
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }

  /**
   * Create a new file with content.
   * Returns WriteResult. External storage sets filesUpdate=null.
   */
  async write(filePath: string, content: string): Promise<WriteResult> {
    const store = this.getStore();
    const namespace = this.getNamespace();

    // Check if file exists
    const existing = await store.get(namespace, filePath);
    if (existing) {
      return {
        error: `Cannot write to ${filePath} because it already exists. Read and then make an edit, or write to a new path.`,
      };
    }

    // Create new file
    const fileData = createFileData(content);
    const storeValue = this.convertFileDataToStoreValue(fileData);
    await store.put(namespace, filePath, storeValue);
    return { path: filePath, filesUpdate: null };
  }

  /**
   * Edit a file by replacing string occurrences.
   * Returns EditResult. External storage sets filesUpdate=null.
   */
  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll: boolean = false,
  ): Promise<EditResult> {
    const store = this.getStore();
    const namespace = this.getNamespace();

    // Get existing file
    const item = await store.get(namespace, filePath);
    if (!item) {
      return { error: `Error: File '${filePath}' not found` };
    }

    try {
      const fileData = this.convertStoreItemToFileData(item);
      const content = fileDataToString(fileData);
      const result = performStringReplacement(
        content,
        oldString,
        newString,
        replaceAll,
      );

      if (typeof result === "string") {
        return { error: result };
      }

      const [newContent, occurrences] = result;
      const newFileData = updateFileData(fileData, newContent);

      // Update file in store
      const storeValue = this.convertFileDataToStoreValue(newFileData);
      await store.put(namespace, filePath, storeValue);
      return { path: filePath, filesUpdate: null, occurrences: occurrences };
    } catch (e: any) {
      return { error: `Error: ${e.message}` };
    }
  }

  /**
   * Structured search results or error string for invalid input.
   */
  async grepRaw(
    pattern: string,
    path: string = "/",
    glob: string | null = null,
  ): Promise<GrepMatch[] | string> {
    const store = this.getStore();
    const namespace = this.getNamespace();
    const items = await this.searchStorePaginated(store, namespace);

    const files: Record<string, FileData> = {};
    for (const item of items) {
      try {
        files[item.key] = this.convertStoreItemToFileData(item);
      } catch {
        // Skip invalid items
        continue;
      }
    }

    return grepMatchesFromFiles(files, pattern, path, glob);
  }

  /**
   * Structured glob matching returning FileInfo objects.
   */
  async globInfo(pattern: string, path: string = "/"): Promise<FileInfo[]> {
    const store = this.getStore();
    const namespace = this.getNamespace();
    const items = await this.searchStorePaginated(store, namespace);

    const files: Record<string, FileData> = {};
    for (const item of items) {
      try {
        files[item.key] = this.convertStoreItemToFileData(item);
      } catch {
        // Skip invalid items
        continue;
      }
    }

    const result = globSearchFiles(files, pattern, path);
    if (result === "No files found") {
      return [];
    }

    const paths = result.split("\n");
    const infos: FileInfo[] = [];
    for (const p of paths) {
      const fd = files[p];
      const size = fd ? fd.content.join("\n").length : 0;
      infos.push({
        path: p,
        is_dir: false,
        size: size,
        modified_at: fd?.modified_at || "",
      });
    }
    return infos;
  }
}
