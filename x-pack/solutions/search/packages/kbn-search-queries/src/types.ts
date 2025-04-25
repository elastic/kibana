/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GenerateQueryOptions {
  rrf: boolean;
  queryString: string;
}

export type IndexFields = Record<string, string[]>;
export type IndicesQuerySourceFields = Record<string, QuerySourceFields>;

export interface ModelField {
  field: string;
  model_id: string;
  indices: string[];
}

export interface ELSERQueryFields extends ModelField {
  sparse_vector: boolean;
}

export interface SemanticField {
  field: string;
  inferenceId: string;
  embeddingType: 'sparse_vector' | 'dense_vector';
  indices: string[];
}

export interface QuerySourceFields {
  elser_query_fields: ELSERQueryFields[];
  dense_vector_query_fields: ModelField[];
  bm25_query_fields: string[];
  source_fields: string[];
  semantic_fields: SemanticField[];
  skipped_fields: number;
}
