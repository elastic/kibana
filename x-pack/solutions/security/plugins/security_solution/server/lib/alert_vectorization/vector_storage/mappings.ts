/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const generateAlertVectorIndexMappings = (): MappingTypeMapping => ({
  dynamic: 'strict',
  properties: {
    alert_id: { type: 'keyword' },
    alert_index: { type: 'keyword' },
    vector: {
      type: 'dense_vector',
      dims: 384,
      index: true,
      similarity: 'cosine',
      index_options: {
        type: 'hnsw',
        m: 16,
        ef_construction: 100,
      },
    },
    feature_text_hash: { type: 'keyword' },
    inference_endpoint_id: { type: 'keyword' },
    feature_text: { type: 'text', index: false },
    '@timestamp': { type: 'date' },
  },
});
