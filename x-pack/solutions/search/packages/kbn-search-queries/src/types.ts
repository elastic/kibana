/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, KnnQuery } from '@elastic/elasticsearch/lib/api/types';

export interface GenerateQueryOptions {
  rrf: boolean;
  queryString: string;
}

export type IndexFields = Record<string, string[]>;
export type QueryGenerationFieldDescriptors = Record<string, IndexQueryFields>;

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

export interface IndexQueryFields {
  bm25_query_fields: string[];
  dense_vector_query_fields: ModelField[];
  elser_query_fields: ELSERQueryFields[];
  semantic_fields: SemanticField[];
  source_fields: string[];
  skipped_fields: number;
}

export interface KnnQueryMatch {
  knn: KnnQuery;
}

export interface GenerateQueryMatches {
  queryMatches: QueryDslQueryContainer[];
  knnMatches: KnnQueryMatch[];
}
