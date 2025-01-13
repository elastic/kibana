/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentEntryType, IndexEntryType } from '@kbn/elastic-assistant-common';

export type EsKnowledgeBaseEntrySchema = EsDocumentEntry | EsIndexEntry;

export interface EsDocumentEntry {
  '@timestamp': string;
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  name: string;
  namespace: string;
  type: DocumentEntryType;
  kb_resource: string;
  required: boolean;
  source: string;
  text: string;
  semantic_text?: string;
  vector?: {
    tokens: Record<string, number>;
    model_id: string;
  };
}

export interface EsIndexEntry {
  '@timestamp': string;
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  name: string;
  namespace: string;
  type: IndexEntryType;
  index: string;
  field: string;
  description: string;
  query_description: string;
  input_schema?: Array<{
    field_name: string;
    field_type: string;
    description: string;
  }>;
  output_fields?: string[];
}

export interface LegacyEsKnowledgeBaseEntrySchema {
  '@timestamp': string;
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  metadata?: {
    kbResource: string;
    source: string;
    required: boolean;
  };
  namespace: string;
  text: string;
  vector?: {
    tokens: Record<string, number>;
    model_id: string;
  };
}
export interface UpdateKnowledgeBaseEntrySchema {
  id: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  name?: string;
  type?: string;
  // Document Entry Fields
  kb_resource?: string;
  required?: boolean;
  source?: string;
  text?: string;
  semantic_text?: string;
  vector?: {
    tokens: Record<string, number>;
    model_id: string;
  };
  // Index Entry Fields
  index?: string;
  field?: string;
  description?: string;
  query_description?: string;
  input_schema?: Array<{
    field_name: string;
    field_type: string;
    description: string;
  }>;
  output_fields?: string[];
}

export interface CreateKnowledgeBaseEntrySchema {
  '@timestamp'?: string;
  id?: string | undefined;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  users: Array<{
    id?: string;
    name?: string;
  }>;
  name: string;
  namespace: string;
  type: string;
  // Document Entry Fields
  kb_resource?: string;
  required?: boolean;
  source?: string;
  text?: string;
  semantic_text?: string;
  vector?: {
    tokens: Record<string, number>;
    model_id: string;
  };
  // Index Entry Fields
  index?: string;
  field?: string;
  description?: string;
  query_description?: string;
  input_schema?: Array<{
    field_name: string;
    field_type: string;
    description: string;
  }>;
  output_fields?: string[];
}
