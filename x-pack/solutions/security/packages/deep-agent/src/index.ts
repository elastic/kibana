/**
 * Deep Agents TypeScript Implementation
 *
 * A TypeScript port of the Python Deep Agents library for building controllable AI agents with LangGraph.
 * This implementation maintains 1:1 compatibility with the Python version.
 */

export { createDeepAgent, type CreateDeepAgentParams } from "./agent";

// Export middleware
export {
  createFilesystemMiddleware,
  createSubAgentMiddleware,
  createPatchToolCallsMiddleware,
  type FilesystemMiddlewareOptions,
  type SubAgentMiddlewareOptions,
  type SubAgent,
  type FileData,
} from "./middleware/index";

// Export backends
export {
  StateBackend,
  StoreBackend,
  FilesystemBackend,
  CompositeBackend,
  type BackendProtocol,
  type BackendFactory,
  type FileInfo,
  type GrepMatch,
  type WriteResult,
  type EditResult,
} from "./backends/index";
