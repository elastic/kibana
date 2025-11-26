/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildApmLatencyIndicator } from '../../../../data/slo/indicator';
import { getApmLatencyQueries } from './get_apm_latency_queries';

describe('getApmLatencyQueries', () => {
  it('returns the total query', () => {
    const indicator = buildApmLatencyIndicator();
    const { totalQuery } = getApmLatencyQueries(indicator);

    expect(totalQuery).toEqual({
      bool: {
        filter: [
          { terms: { 'processor.event': ['metric'] } },
          { term: { 'metricset.name': 'transaction' } },
          { exists: { field: 'transaction.duration.histogram' } },
          { term: { 'service.name': 'o11y-app' } },
          { term: { 'service.environment': 'development' } },
          { term: { 'transaction.type': 'request' } },
          { term: { 'transaction.name': 'GET /slow' } },
        ],
      },
    });
  });
});
