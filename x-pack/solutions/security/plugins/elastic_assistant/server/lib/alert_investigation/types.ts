/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EntityExtractionConfig {
  readonly enabled: boolean;
  readonly exclusionFilters: Record<string, string[]>;
}

export type ObservableTypeKey =
  | 'ipv4'
  | 'ipv6'
  | 'url'
  | 'hostname'
  | 'file_hash'
  | 'file_path'
  | 'email'
  | 'domain'
  | 'agent_id'
  | 'user'
  | 'process'
  | 'registry'
  | 'service';

export interface ExtractedEntity {
  readonly typeKey: ObservableTypeKey;
  readonly value: string;
  readonly sourceField: string;
  readonly alertId: string;
}

export const DEFAULT_ENTITY_EXTRACTION_CONFIG: EntityExtractionConfig = {
  enabled: true,
  exclusionFilters: {
    user: ['SYSTEM', 'LOCAL SERVICE', 'NETWORK SERVICE'],
    hostname: ['localhost'],
  },
};
