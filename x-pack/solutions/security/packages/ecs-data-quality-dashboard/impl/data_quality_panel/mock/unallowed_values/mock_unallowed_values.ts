/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockUnallowedValuesResponse = [
  {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 3,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      'event.category': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'an_invalid_category',
            doc_count: 2,
          },
          {
            key: 'theory',
            doc_count: 1,
          },
        ],
      },
    },
    status: 200,
  },
  {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 4,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      'event.kind': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
    },
    status: 200,
  },
  {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 4,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      'event.outcome': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
    },
    status: 200,
  },
  {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 4,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      'event.type': {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
    },
    status: 200,
  },
];
