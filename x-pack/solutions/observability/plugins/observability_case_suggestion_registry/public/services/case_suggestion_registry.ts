/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

export interface SuggestionDefinitionPublicProps<TPayload = {}, TMetadata = {}> {
  data: {
    attachments: Array<{
      attachment: Array<Record<string, unknown>>;
      payload: TPayload;
    }>;
    metadata?: TMetadata;
  };
}

export interface SuggestionDefinitionPublic<TPayload = {}, TMetadata = {}> {
  type: string;
  displayName: string;
  description: string;
  children?: React.LazyExoticComponent<
    React.FC<SuggestionDefinitionPublicProps<TPayload, TMetadata>>
  >;
}

export class CaseSuggestionRegistry {
  private registry: Map<string, SuggestionDefinitionPublic> = new Map();

  public register(suggestion: SuggestionDefinitionPublic): void {
    if (this.registry.has(suggestion.type)) {
      throw new Error(`Suggestion type '${suggestion.type}' is already registered.`);
    }
    this.registry.set(suggestion.type, suggestion);
  }

  get(type: string): SuggestionDefinitionPublic | undefined {
    return this.registry.get(type);
  }

  getAll(): SuggestionDefinitionPublic[] {
    return Array.from(this.registry.values());
  }
}
