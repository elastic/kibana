/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Document } from '@langchain/core/documents';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
export type IndicesQuerySourceFields = Record<string, QuerySourceFields>;

export enum MessageRole {
  'user' = 'human',
  'assistant' = 'assistant',
  'system' = 'system',
}

interface ModelField {
  field: string;
  model_id: string;
  indices: string[];
}

interface ELSERQueryFields extends ModelField {
  sparse_vector: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface SemanticField {
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

const BASE_API_PATH = '/internal/search_playground';

export enum APIRoutes {
  BASE_API = BASE_API_PATH,
  POST_API_KEY = `${BASE_API_PATH}/api_key`,
  POST_CHAT_MESSAGE = `${BASE_API_PATH}/chat`,
  POST_QUERY_SOURCE_FIELDS = `${BASE_API_PATH}/query_source_fields`,
  GET_INDICES = `${BASE_API_PATH}/indices`,
  POST_SEARCH_QUERY = `${BASE_API_PATH}/search`,
  GET_INDEX_MAPPINGS = `${BASE_API_PATH}/mappings`,
  POST_QUERY_TEST = `${BASE_API_PATH}/query_test`,
  PUT_PLAYGROUND_CREATE = `${BASE_API_PATH}/playgrounds`,
  PUT_PLAYGROUND_UPDATE = `${BASE_API_PATH}/playgrounds/{id}`,
  GET_PLAYGROUND = `${BASE_API_PATH}/playgrounds/{id}`,
  GET_PLAYGROUNDS = `${BASE_API_PATH}/playgrounds`,
  DELETE_PLAYGROUND = `${BASE_API_PATH}/playgrounds/{id}`,
}

export enum LLMs {
  openai = 'openai',
  openai_azure = 'openai_azure',
  openai_other = 'openai_other',
  bedrock = 'bedrock',
  gemini = 'gemini',
  inference = 'inference',
}

export interface ChatRequestData {
  connector_id: string;
  prompt: string;
  indices: string;
  citations: boolean;
  elasticsearch_query: string;
  summarization_model?: string;
  source_fields: string;
  doc_size: number;
}

export interface SearchPlaygroundConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface ModelProvider {
  name: string;
  model: string;
  promptTokenLimit: number;
  provider: LLMs;
}

export interface Pagination {
  from: number;
  size: number;
  total: number;
}

export interface QueryTestResponse {
  documents?: Document[];
  searchResponse: SearchResponse;
}
export interface PlaygroundMetadata {
  id: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}
export interface PlaygroundSavedObject {
  name: string;
  indices: string[];
  queryFields: Record<string, string[] | undefined>;
  elasticsearchQueryJSON: string;
  userElasticsearchQueryJSON?: string;
  prompt?: string;
  citations?: boolean;
  context?: {
    sourceFields: Record<string, string[] | undefined>;
    docSize: number;
  };
  summarizationModel?: {
    connectorId: string;
    modelId?: string;
  };
}

export interface PlaygroundResponse {
  _meta: PlaygroundMetadata;
  data: PlaygroundSavedObject;
}

export interface PlaygroundListObject {
  id: string;
  name: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}
export interface PlaygroundListResponse {
  _meta: {
    page: number;
    size: number;
    total: number;
  };
  items: PlaygroundListObject[];
}
