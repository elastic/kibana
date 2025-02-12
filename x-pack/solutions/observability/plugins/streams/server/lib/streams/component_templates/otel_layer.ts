/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexSettings, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { FieldDefinition } from '@kbn/streams-schema';

export const otelSettings: IndicesIndexSettings = {
  index: {
    mode: 'logsdb',
    sort: {
      field: ['resource.attributes.host.name', '@timestamp'],
    },
  },
};

export const otelPrefixes = [
  'body.structured.',
  'attributes.',
  'scope.attributes.',
  'resource.attributes.',
];

export const otelFields: FieldDefinition = {
  'scope.dropped_attributes_count': {
    type: 'long',
  },
  dropped_attributes_count: {
    type: 'long',
  },
  'resource.dropped_attributes_count': {
    type: 'long',
  },
  'resource.schema_url': {
    type: 'keyword',
  },
  'scope.name': {
    type: 'keyword',
  },
  'scope.schema_url': {
    type: 'keyword',
  },
  'scope.version': {
    type: 'keyword',
  },
  observed_timestamp: {
    type: 'date',
  },
  trace_id: {
    type: 'keyword',
  },
  span_id: {
    type: 'keyword',
  },
  severity_text: {
    type: 'keyword',
  },
  'body.text': {
    type: 'match_only_text',
  },
  'severity.number': {
    type: 'long',
  },
  'attributes.exception.type': {
    type: 'keyword',
  },
  'attributes.exception.message': {
    type: 'keyword',
  },
  'data_stream.dataset': {
    type: 'keyword',
  },
  'attributes.exception.stacktrace': {
    type: 'match_only_text',
  },
  'resource.attributes.host.name': {
    type: 'keyword',
  },
};

export const otelMappings: Record<string, MappingProperty> = {
  'error.exception.type': {
    path: 'attributes.exception.type',
    type: 'alias',
  },
  'span.id': {
    path: 'span_id',
    type: 'alias',
  },
  message: {
    path: 'body.text',
    type: 'alias',
  },
  'trace.id': {
    path: 'trace_id',
    type: 'alias',
  },
  'log.level': {
    path: 'severity_text',
    type: 'alias',
  },
  'error.stack_trace': {
    path: 'attributes.exception.stacktrace',
    type: 'alias',
  },
  'error.exception.message': {
    path: 'attributes.exception.message',
    type: 'alias',
  },
  'event.dataset': {
    path: 'data_stream.dataset',
    type: 'alias',
  },
};
