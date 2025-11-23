/**
 * Backends for pluggable file storage.
 *
 * Backends provide a uniform interface for file operations while allowing
 * different storage mechanisms (state, store, filesystem, database, etc.).
 */

export type {
  BackendProtocol,
  BackendFactory,
  FileData,
  FileInfo,
  GrepMatch,
  WriteResult,
  EditResult,
  StateAndStore,
} from "./protocol";

export { StateBackend } from "./state";
export { StoreBackend } from "./store";
export { FilesystemBackend } from "./filesystem";
export { CompositeBackend } from "./composite";

// Re-export utils for convenience
export * from "./utils";
