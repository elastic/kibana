/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';

export interface ToolExecutionMetadata {
  toolExecutionId: string;
  toolId: string;
  toolName: string;
  arguments: Record<string, any>;
  result: any;
  timestamp: number;
  conversationId?: string;
  connectorId?: string;
}

export class ToolExecutionMetadataStore {
  private readonly maxEntries: number;
  private readonly metadataCache: Map<string, ToolExecutionMetadata> = new Map();

  constructor( maxEntries: number = 10) {
    this.maxEntries = maxEntries;
  }

  /**
   * Store tool execution metadata
   */
  public storeMetadata(metadata: ToolExecutionMetadata): void {
    try {
      // Remove oldest entry if we've reached the limit
      if (this.metadataCache.size >= this.maxEntries) {
        const oldestKey = this.metadataCache.keys().next().value;
        this.metadataCache.delete(oldestKey);
      }

      //@TODO: remove
      console.log(`--@@storeMetadata toolExecutionId`,metadata.toolExecutionId, "\n", JSON.stringify(metadata));
      this.metadataCache.set(metadata.toolExecutionId, metadata);
    } catch (error) {
    }
  }

  /**
   * Retrieve tool execution metadata by toolExecutionId
   */
  public getMetadata(toolExecutionId: string): ToolExecutionMetadata | undefined {
    try {
      const metadata = this.metadataCache.get(toolExecutionId);
      if (metadata) {
        console.log(`--@@getMetadata toolExecutionId`, toolExecutionId, "\n", JSON.stringify(metadata));
      } else {
        console.log(`--@@getMetadata toolExecutionId`, toolExecutionId, "\n", JSON.stringify(metadata));
      }
      return metadata;
    } catch (error) {
      console.log(`--@@getMetadata error`, error);
      return undefined;
    }
  }

  /**
   * Get all stored metadata (for debugging/testing purposes)
   */
  public getAllMetadata(): ToolExecutionMetadata[] {
    return Array.from(this.metadataCache.values());
  }

  /**
   * Clear all stored metadata
   */
  public clear(): void {
    this.metadataCache.clear();
    console.log(`--@@clear`);
  }

  /**
   * Get the number of stored entries
   */
  public getSize(): number {
    return this.metadataCache.size;
  }
}
