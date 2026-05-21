/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexRequest } from '@elastic/elasticsearch/lib/api/types';

/**
 * Sample documents the regression dataset's gold queries rely on for
 * executable validation.
 *
 * `traces-apm-*` and `metrics-apm-*` are auto-mapped by Elasticsearch on
 * first ingest; we do not provide an explicit mapping (mirroring the
 * LangSmith-era setup) because the dataset's gold queries reference field
 * paths that the agent will discover via `get_index_mapping` rather than
 * any pre-declared schema. The single document per index is enough to (a)
 * make the index exist so `FROM <index>-*` wildcards resolve and (b) give
 * the result-equivalence evaluator a non-empty result set for the gold
 * query to compare against.
 */

export const tracesApmIndexRequest: IndexRequest = {
  index: 'traces-apm-production.evaluations.2025.01.01',
  document: {
    '@timestamp': '2024-04-02T12:00:00.000Z',
    event: { outcome: 'success' },
    transaction: {
      duration: { us: 1000 },
      id: '945254c567a5417e',
    },
    service: { name: 'my-service' },
  },
};

export const metricsApmIndexRequest: IndexRequest = {
  index: 'metrics-apm-production.evaluations.2025.01.01',
  document: {
    '@timestamp': '2024-04-02T12:00:00.000Z',
    metricset: {
      name: 'transaction',
      interval: '1m',
    },
    transaction: {
      duration: { us: 13980 },
    },
  },
};

export const esqlFixtureDocumentRequests: readonly IndexRequest[] = [
  tracesApmIndexRequest,
  metricsApmIndexRequest,
];
