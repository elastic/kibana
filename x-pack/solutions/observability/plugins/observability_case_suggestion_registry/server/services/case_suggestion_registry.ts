/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDefinition } from '@kbn/inference-common';

export interface CaseSuggestionPayload<
  TPayload = Record<string, unknown>, // Generic type for the payload, defaults to a record of unknown key-value pairs
  TMetadata = Record<string, unknown> // Generic type for metadata, defaults to a record of unknown key-value pairs
> {
  suggestionId: string; // Unique identifier for the suggestion
  data: {
    attachments: Array<{
      attachment: Record<string, unknown>; // Details of the attachment
      payload: TPayload; // Payload associated with the attachment
    }>;
    metadata?: TMetadata; // Optional metadata associated with the suggestion
  };
}

export interface CaseSuggestion {
  suggestionId: string; // Unique identifier for the case suggestion
  displayName: string; // Human-readable name for the suggestion
  description: string; // Description of the suggestion's purpose
  availableTools: Record<string, ToolDefinition>; // Tools available for this suggestion, keyed by tool name
  toolHandlers: Record<string, () => Promise<CaseSuggestionPayload>>; // Handlers for tools, keyed to match the tool name
}

export class CaseSuggestionRegistry {
  private registry: Map<string, CaseSuggestion> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();
  private toolHandlers: Map<string, () => Promise<unknown>> = new Map();

  public register(suggestion: CaseSuggestion): void {
    if (this.registry.has(suggestion.suggestionId)) {
      throw new Error(`Suggestion type '${suggestion.suggestionId}' is already registered.`);
    }
    this.registry.set(suggestion.suggestionId, suggestion);
    Object.entries(suggestion.availableTools).forEach(([toolName, toolDefinition]) => {
      if (this.tools.has(toolName)) {
        throw new Error(
          `Tool '${toolName}' is already registered for suggestion type '${suggestion.type}'.`
        );
      }
      this.tools.set(toolName, toolDefinition);
    });
    Object.entries(suggestion.toolHandlers).forEach(([handlerName, handler]) => {
      if (this.toolHandlers.has(handlerName)) {
        throw new Error(
          `Tool handler '${handlerName}' is already registered for suggestion type '${suggestion.type}'.`
        );
      }
      this.toolHandlers.set(handlerName, handler);
    });
  }

  get(type: string): CaseSuggestion | undefined {
    return this.registry.get(type);
  }

  getTool(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  getToolHandler(handlerName: string): (() => Promise<unknown>) | undefined {
    return this.toolHandlers.get(handlerName);
  }

  getAllTools(): Record<string, ToolDefinition> {
    return Object.fromEntries(this.tools.entries());
  }

  getAllToolHandlers(): Record<string, () => Promise<unknown>> {
    return Object.fromEntries(this.toolHandlers.entries());
  }

  getAll(): CaseSuggestion[] {
    return Array.from(this.registry.values());
  }

  filterBySignalType(signalType: string): CaseSuggestion[] {
    return this.getAll().filter((s) => s.signalType === signalType);
  }
}
