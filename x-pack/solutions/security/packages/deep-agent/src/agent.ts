import {
  createAgent,
  humanInTheLoopMiddleware,
  anthropicPromptCachingMiddleware,
  todoListMiddleware,
  summarizationMiddleware,
  type AgentMiddleware,
  type ReactAgent,
  type InterruptOnConfig,
} from "langchain";
import type { StructuredTool } from "@langchain/core/tools";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import type {
  BaseCheckpointSaver,
  BaseStore,
} from "@langchain/langgraph-checkpoint";

import {
  createFilesystemMiddleware,
  createSubAgentMiddleware,
  createPatchToolCallsMiddleware,
  type SubAgent,
} from "./middleware/index";
import { StateBackend, type BackendProtocol } from "./backends/index";
import { InteropZodObject } from "@langchain/core/utils/types";
import { AnnotationRoot } from "@langchain/langgraph";

/**
 * Configuration parameters for creating a Deep Agent
 * Matches Python's create_deep_agent parameters
 */
export interface CreateDeepAgentParams<
  ContextSchema extends
    | AnnotationRoot<any>
    | InteropZodObject = AnnotationRoot<any>,
> {
  /** The model to use (model name string or LanguageModelLike instance). Defaults to claude-sonnet-4-5-20250929 */
  model?: BaseLanguageModel | string;
  /** Tools the agent should have access to */
  tools?: StructuredTool[];
  /** Custom system prompt for the agent. This will be combined with the base agent prompt */
  systemPrompt?: string;
  /** Custom middleware to apply after standard middleware */
  middleware?: AgentMiddleware[];
  /** List of subagent specifications for task delegation */
  subagents?: SubAgent[];
  /** Structured output response format for the agent */
  responseFormat?: any; // ResponseFormat type is complex, using any for now
  /** Optional schema for context (not persisted between invocations) */
  contextSchema?: ContextSchema;
  /** Optional checkpointer for persisting agent state between runs */
  checkpointer?: BaseCheckpointSaver | boolean;
  /** Optional store for persisting longterm memories */
  store?: BaseStore;
  /**
   * Optional backend for filesystem operations.
   * Can be either a backend instance or a factory function that creates one.
   * The factory receives a config object with state and store.
   */
  backend?:
    | BackendProtocol
    | ((config: { state: unknown; store?: BaseStore }) => BackendProtocol);
  /** Optional interrupt configuration mapping tool names to interrupt configs */
  interruptOn?: Record<string, boolean | InterruptOnConfig>;
  /** The name of the agent */
  name?: string;
}

const BASE_PROMPT = `In order to complete the objective that the user asks of you, you have access to a number of standard tools.`;

/**
 * Create a Deep Agent with middleware-based architecture.
 *
 * Matches Python's create_deep_agent function, using middleware for all features:
 * - Todo management (todoListMiddleware)
 * - Filesystem tools (createFilesystemMiddleware)
 * - Subagent delegation (createSubAgentMiddleware)
 * - Conversation summarization (summarizationMiddleware)
 * - Prompt caching (anthropicPromptCachingMiddleware)
 * - Tool call patching (createPatchToolCallsMiddleware)
 * - Human-in-the-loop (humanInTheLoopMiddleware) - optional
 *
 * @param params Configuration parameters for the agent
 * @returns ReactAgent instance ready for invocation
 */
export function createDeepAgent<
  ContextSchema extends
    | AnnotationRoot<any>
    | InteropZodObject = AnnotationRoot<any>,
>(
  params: CreateDeepAgentParams<ContextSchema> = {},
): ReactAgent<any, any, ContextSchema, any> {
  const {
    model = "claude-sonnet-4-5-20250929",
    tools = [],
    systemPrompt,
    middleware: customMiddleware = [],
    subagents = [],
    responseFormat,
    contextSchema,
    checkpointer,
    store,
    backend,
    interruptOn,
    name,
  } = params;

  // Combine system prompt with base prompt like Python implementation
  const finalSystemPrompt = systemPrompt
    ? `${systemPrompt}\n\n${BASE_PROMPT}`
    : BASE_PROMPT;

  // Create backend configuration for filesystem middleware
  // If no backend is provided, use a factory that creates a StateBackend
  const filesystemBackend = backend
    ? backend
    : (config: { state: unknown; store?: BaseStore }) =>
        new StateBackend(config);

  const middleware: AgentMiddleware[] = [
    // Provides todo list management capabilities for tracking tasks
    todoListMiddleware(),
    // Enables filesystem operations and optional long-term memory storage
    createFilesystemMiddleware({ backend: filesystemBackend }),
    // Enables delegation to specialized subagents for complex tasks
    createSubAgentMiddleware({
      defaultModel: model,
      defaultTools: tools,
      defaultMiddleware: [
        // Subagent middleware: Todo list management
        todoListMiddleware(),
        // Subagent middleware: Filesystem operations
        createFilesystemMiddleware({
          backend: filesystemBackend,
        }),
        // Subagent middleware: Automatic conversation summarization when token limits are approached
        summarizationMiddleware({
          model,
          maxTokensBeforeSummary: 170000,
          messagesToKeep: 6,
        }),
        // Subagent middleware: Anthropic prompt caching for improved performance
        anthropicPromptCachingMiddleware({
          unsupportedModelBehavior: "ignore",
        }),
        // Subagent middleware: Patches tool calls for compatibility
        createPatchToolCallsMiddleware(),
      ],
      defaultInterruptOn: interruptOn,
      subagents,
      generalPurposeAgent: true,
    }),
    // Automatically summarizes conversation history when token limits are approached
    summarizationMiddleware({
      model,
      maxTokensBeforeSummary: 170000,
      messagesToKeep: 6,
    }),
    // Enables Anthropic prompt caching for improved performance and reduced costs
    anthropicPromptCachingMiddleware({
      unsupportedModelBehavior: "ignore",
    }),
    // Patches tool calls to ensure compatibility across different model providers
    createPatchToolCallsMiddleware(),
  ];

  // Add human-in-the-loop middleware if interrupt config provided
  if (interruptOn) {
    middleware.push(humanInTheLoopMiddleware({ interruptOn }));
  }

  // Add custom middleware last (after all built-in middleware)
  middleware.push(...customMiddleware);

  return createAgent({
    model,
    systemPrompt: finalSystemPrompt,
    tools,
    middleware,
    responseFormat,
    contextSchema,
    checkpointer,
    store,
    name,
  });
}
