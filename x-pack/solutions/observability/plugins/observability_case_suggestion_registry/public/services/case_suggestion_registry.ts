/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

export interface CaseDefinitionPublicProps<TPayload = {}, TMetadata = {}> {
  data: {
    attachments: Array<{
      attachment: Array<Record<string, unknown>>;
      payload: TPayload;
    }>;
    metadata?: TMetadata;
  };
}

export interface CaseDefinitionPublic<TPayload = {}, TMetadata = {}> {
  type: string;
  displayName: string;
  description: string;
  children?: React.LazyExoticComponent<React.FC<CaseDefinitionPublicProps<TPayload, TMetadata>>>;
}

export class CaseSuggestionRegistry {
  private registry: Map<string, CaseSuggestion> = new Map();

  public register(suggestion: CaseSuggestion): void {
    if (this.registry.has(suggestion.type)) {
      throw new Error(`Suggestion type '${suggestion.type}' is already registered.`);
    }
    this.registry.set(suggestion.type, suggestion);
  }

  get(type: string): CaseSuggestion | undefined {
    return this.registry.get(type);
  }

  getAll(): CaseSuggestion[] {
    return Array.from(this.registry.values());
  }

  filterBySignalType(signalType: string): CaseSuggestion[] {
    return this.getAll().filter((s) => s.signalType === signalType);
  }
}
