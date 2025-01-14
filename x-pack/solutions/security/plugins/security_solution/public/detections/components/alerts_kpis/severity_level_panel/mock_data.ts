/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.000Z';

export const mockAlertsData = {
  took: 0,
  timeout: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 47,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    statusBySeverity: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'high',
          doc_count: 78,
        },
        {
          key: 'low',
          doc_count: 46,
        },
        {
          key: 'medium',
          doc_count: 32,
        },
        {
          key: 'critical',
          doc_count: 21,
        },
      ],
    },
  },
};

export const mockAlertsEmptyData = {
  took: 0,
  timeout: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 0,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    statusBySeverity: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
  },
};

export const query = {
  size: 0,
  query: {
    bool: {
      filter: [
        {
          bool: {
            filter: [],
            must: [],
            must_not: [],
            should: [],
          },
        },
        { range: { '@timestamp': { gte: from, lte: to } } },
      ],
    },
  },
  aggs: {
    statusBySeverity: {
      terms: {
        field: 'kibana.alert.severity',
      },
    },
  },
  runtime_mappings: undefined,
};

export const parsedAlerts: Array<{ key: Severity; value: number; label: string }> = [
  { key: 'high', value: 78, label: 'High' },
  { key: 'low', value: 46, label: 'Low' },
  { key: 'medium', value: 32, label: 'Medium' },
  { key: 'critical', value: 21, label: 'Critical' },
];
