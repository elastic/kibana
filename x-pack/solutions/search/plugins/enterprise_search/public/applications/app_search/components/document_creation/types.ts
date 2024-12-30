/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type DocumentCreationMode = 'api' | 'json' | 'elasticsearchIndex';

export enum DocumentCreationStep {
  ShowCreationModes,
  AddDocuments,
  ShowSummary,
}

export interface DocumentCreationSummary {
  errors: string[];
  validDocuments: {
    total: number;
    examples: object[];
  };
  invalidDocuments: {
    total: number;
    examples: Array<{
      document: object;
      errors: string[];
    }>;
  };
  newSchemaFields: string[];
}
