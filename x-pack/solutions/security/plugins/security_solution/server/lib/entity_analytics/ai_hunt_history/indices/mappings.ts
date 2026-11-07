/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * ES mappings for saved AI Hunt records. The heavy `result` payload (artifacts
 * / activities / narrative needed to re-render the canvas) is stored with
 * indexing disabled — it is only ever fetched by id and re-hydrated on the
 * client, never queried — while the list-view fields (question, summary,
 * timestamps, pinned) remain queryable/sortable.
 */
export const generateHuntHistoryIndexMappings = (): MappingTypeMapping => ({
  dynamic: 'strict',
  properties: {
    id: { type: 'keyword' },
    space: { type: 'keyword' },
    question: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    scoped_prompt: { type: 'text', index: false },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    created_by: { type: 'keyword' },
    name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    pinned: { type: 'boolean' },
    status: { type: 'keyword' },
    summary: {
      type: 'object',
      properties: {
        verdict: { type: 'text' },
        severity: { type: 'keyword' },
        confidence: { type: 'integer' },
        finding_count: { type: 'integer' },
        entity_count: { type: 'integer' },
        alert_count: { type: 'integer' },
      },
    },
    result: { type: 'object', enabled: false },
  },
});
