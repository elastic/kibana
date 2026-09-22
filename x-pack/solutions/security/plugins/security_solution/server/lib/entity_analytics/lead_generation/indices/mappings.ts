/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const generateLeadIndexMappings = (): MappingTypeMapping => ({
  dynamic: 'strict',
  properties: {
    id: { type: 'keyword' },
    title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    byline: { type: 'text' },
    description: { type: 'text' },
    entity: {
      type: 'object',
      properties: {
        type: { type: 'keyword' },
        name: { type: 'keyword' },
        id: { type: 'keyword' },
      },
    },
    tags: { type: 'keyword' },
    priority: { type: 'integer' },
    chat_recommendations: { type: 'text' },
    timestamp: { type: 'date' },
    staleness: { type: 'keyword' },
    status: { type: 'keyword' },
    observations: {
      type: 'object',
      properties: {
        entity_id: { type: 'keyword' },
        module_id: { type: 'keyword' },
        type: { type: 'keyword' },
        score: { type: 'float' },
        severity: { type: 'keyword' },
        confidence: { type: 'float' },
        description: { type: 'text' },
        metadata: { type: 'object', enabled: false },
      },
    },
    top_related_entities: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        type: { type: 'keyword' },
        name: { type: 'keyword' },
        kinds: { type: 'keyword' },
        risk_level: { type: 'keyword' },
        criticality: { type: 'keyword' },
        interacted_with_at_least: { type: 'integer' },
      },
    },
    related_entity_counts: {
      type: 'object',
      properties: {
        kind: { type: 'keyword' },
        count: { type: 'integer' },
      },
    },
    execution_uuid: { type: 'keyword' },
    source_type: { type: 'keyword' },
    origin: { type: 'keyword' },
    created_at: { type: 'date' },
    changed_at: { type: 'date' },
    version: { type: 'integer' },
    content_hash: { type: 'keyword' },
  },
});
