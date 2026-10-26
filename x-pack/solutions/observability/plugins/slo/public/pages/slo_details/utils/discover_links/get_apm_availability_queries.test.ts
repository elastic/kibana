/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildApmAvailabilityIndicator } from '../../../../data/slo/indicator';
import { getApmAvailabilityQueries } from './get_apm_availability_queries';

describe('getApmAvailabilityQueries', () => {
  it('returns the queries', () => {
    const indicator = buildApmAvailabilityIndicator();
    const { goodQuery, badQuery, totalQuery } = getApmAvailabilityQueries(indicator);
    expect(goodQuery).toEqual({
      bool: {
        filter: [
          { term: { 'metricset.name': 'transaction' } },
          { terms: { 'event.outcome': ['success', 'failure'] } },
          { term: { 'service.name': 'o11y-app' } },
          { term: { 'service.environment': 'development' } },
          { term: { 'transaction.type': 'request' } },
          { term: { 'transaction.name': 'GET /flaky' } },
          { term: { 'event.outcome': 'success' } },
        ],
      },
    });

    expect(badQuery).toEqual({
      bool: {
        filter: [
          { term: { 'metricset.name': 'transaction' } },
          { terms: { 'event.outcome': ['success', 'failure'] } },
          { term: { 'service.name': 'o11y-app' } },
          { term: { 'service.environment': 'development' } },
          { term: { 'transaction.type': 'request' } },
          { term: { 'transaction.name': 'GET /flaky' } },
          { term: { 'event.outcome': 'failure' } },
        ],
      },
    });

    expect(totalQuery).toEqual({
      bool: {
        filter: [
          { term: { 'metricset.name': 'transaction' } },
          { terms: { 'event.outcome': ['success', 'failure'] } },
          { term: { 'service.name': 'o11y-app' } },
          { term: { 'service.environment': 'development' } },
          { term: { 'transaction.type': 'request' } },
          { term: { 'transaction.name': 'GET /flaky' } },
        ],
      },
    });
  });
});
