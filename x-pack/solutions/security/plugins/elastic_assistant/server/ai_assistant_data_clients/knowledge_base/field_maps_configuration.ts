/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FieldMap } from '@kbn/data-stream-adapter';

export const ASSISTANT_ELSER_INFERENCE_ID = 'elastic-security-ai-assistant-elser2';
export const ELASTICSEARCH_ELSER_INFERENCE_ID = '.elser-2-elasticsearch';

export const knowledgeBaseFieldMap: FieldMap = {
  // Base fields
  '@timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  id: {
    type: 'keyword',
    array: false,
    required: true,
  },
  created_at: {
    type: 'date',
    array: false,
    required: false,
  },
  created_by: {
    type: 'keyword',
    array: false,
    required: false,
  },
  updated_at: {
    type: 'date',
    array: false,
    required: false,
  },
  updated_by: {
    type: 'keyword',
    array: false,
    required: false,
  },
  users: {
    type: 'nested',
    array: true,
    required: false,
  },
  'users.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'users.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  name: {
    type: 'keyword',
    array: false,
    required: false,
  },
  // Discriminator: 'document' | 'index'
  type: {
    type: 'keyword',
    array: false,
    required: true,
  },
  // Document Entry fields
  kb_resource: {
    type: 'keyword',
    array: false,
    required: false,
  },
  required: {
    type: 'boolean',
    array: false,
    required: false,
  },
  source: {
    type: 'keyword',
    array: false,
    required: false,
  },
  text: {
    type: 'text',
    array: false,
    required: false,
  },
  // Embeddings field
  semantic_text: {
    type: 'semantic_text',
    array: false,
    required: false,
    inference_id: ASSISTANT_ELSER_INFERENCE_ID,
  },
  vector: {
    type: 'object',
    array: false,
    required: false,
  },
  'vector.tokens': {
    type: 'rank_features',
    array: false,
    required: false,
  },
  // Index Entry fields
  index: {
    type: 'keyword',
    array: false,
    required: false,
  },
  field: {
    type: 'keyword',
    array: false,
    required: false,
  },
  description: {
    type: 'text',
    array: false,
    required: false,
  },
  query_description: {
    type: 'text',
    array: false,
    required: false,
  },
  input_schema: {
    type: 'nested',
    array: true,
    required: false,
  },
  'input_schema.field_name': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'input_schema.field_type': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'input_schema.description': {
    type: 'text',
    array: false,
    required: true,
  },
  output_fields: {
    type: 'keyword',
    array: true,
    required: false,
  },
} as const;
