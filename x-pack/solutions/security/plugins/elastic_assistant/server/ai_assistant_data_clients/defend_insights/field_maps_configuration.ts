/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FieldMap } from '@kbn/data-stream-adapter';

export const defendInsightsFieldMap: FieldMap = {
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
  last_viewed_at: {
    type: 'date',
    array: false,
    required: true,
  },
  updated_at: {
    type: 'date',
    array: false,
    required: true,
  },
  created_at: {
    type: 'date',
    array: false,
    required: true,
  },
  endpoint_ids: {
    type: 'keyword',
    array: true,
    required: false,
  },
  insight_type: {
    type: 'keyword',
    required: true,
  },
  insights: {
    type: 'nested',
    array: true,
    required: false,
  },
  'insights.group': {
    type: 'keyword',
    array: true,
    required: true,
  },
  'insights.events': {
    type: 'nested',
    array: true,
    required: false,
  },
  'insights.events.endpoint_id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'insights.events.id': {
    type: 'keyword',
    array: false,
    required: true,
  },
  'insights.events.value': {
    type: 'text',
    array: false,
    required: true,
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
  api_config: {
    type: 'object',
    array: false,
    required: true,
  },
  'api_config.connector_id': {
    type: 'keyword',
    array: false,
    required: true,
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
  events_context_count: {
    type: 'integer',
    array: false,
    required: false,
  },
  status: {
    type: 'keyword',
    array: false,
    required: true,
  },
  namespace: {
    type: 'keyword',
    array: false,
    required: true,
  },
  average_interval_ms: {
    type: 'integer',
    array: false,
    required: false,
  },
  failure_reason: {
    type: 'keyword',
    array: false,
    required: false,
  },
  generation_intervals: {
    type: 'nested',
    array: true,
    required: false,
  },
  'generation_intervals.date': {
    type: 'date',
    array: false,
    required: true,
  },
  'generation_intervals.duration_ms': {
    type: 'integer',
    array: false,
    required: true,
  },
} as const;
