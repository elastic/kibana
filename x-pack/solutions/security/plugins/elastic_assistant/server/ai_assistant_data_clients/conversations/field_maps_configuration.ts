/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FieldMap } from '@kbn/data-stream-adapter';

export const conversationsFieldMap: FieldMap = {
  '@timestamp': {
    type: 'date',
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
  id: {
    type: 'keyword',
    array: false,
    required: true,
  },
  title: {
    type: 'keyword',
    array: false,
    required: true,
  },
  is_default: {
    type: 'boolean',
    array: false,
    required: false,
  },
  updated_at: {
    type: 'date',
    array: false,
    required: false,
  },
  created_at: {
    type: 'date',
    array: false,
    required: false,
  },
  messages: {
    type: 'nested',
    array: true,
    required: false,
  },
  'messages.@timestamp': {
    type: 'date',
    array: false,
    required: true,
  },
  'messages.role': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'messages.is_error': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'messages.content': {
    type: 'text',
    array: false,
    required: false,
  },
  'messages.reader': {
    type: 'object',
    array: false,
    required: false,
  },
  'messages.trace_data': {
    type: 'object',
    array: false,
    required: false,
  },
  'messages.trace_data.transaction_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'messages.trace_data.trace_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  replacements: {
    type: 'object',
    array: false,
    required: false,
  },
  'replacements.value': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'replacements.uuid': {
    type: 'keyword',
    array: false,
    required: false,
  },
  summary: {
    type: 'object',
    array: false,
    required: false,
  },
  'summary.content': {
    type: 'text',
    array: false,
    required: false,
  },
  'summary.@timestamp': {
    type: 'date',
    array: false,
    required: true,
  },
  'summary.public': {
    type: 'boolean',
    array: false,
    required: false,
  },
  'summary.confidence': {
    type: 'keyword',
    array: false,
    required: false,
  },
  api_config: {
    type: 'object',
    array: false,
    required: false,
  },
  'api_config.connector_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'api_config.action_type_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'api_config.default_system_prompt_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'api_config.provider': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'api_config.model': {
    type: 'keyword',
    array: false,
    required: false,
  },
} as const;

// Once the `contentReferencesEnabled` feature flag is removed, the properties from the schema bellow should me moved into `conversationsFieldMap`
export const conversationsContentReferencesFieldMap: FieldMap = {
  ...conversationsFieldMap,
  'messages.metadata': {
    type: 'object',
    array: false,
    required: false,
  },
  'messages.metadata.content_references': {
    type: 'flattened',
    array: false,
    required: false,
  },
} as const;
