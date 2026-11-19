/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GroupedSearchQueryResponseRT } from '../../../../common/alerting/logs/log_threshold';
import { isLeft } from 'fp-ts/Either';
import { formatLogThresholdSearchResponseError } from './format_search_response_error';

const baseSearchResponse = {
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  timed_out: false,
  took: 1,
  hits: {
    total: {
      value: 0,
      relation: 'eq' as const,
    },
    hits: [],
  },
};

describe('formatLogThresholdSearchResponseError', () => {
  it('returns a helpful message when grouped aggregations are missing', () => {
    const searchResponse = {
      ...baseSearchResponse,
      aggregations: undefined,
    };

    const decoded = GroupedSearchQueryResponseRT.decode(searchResponse);
    expect(isLeft(decoded)).toBe(true);

    if (!isLeft(decoded)) {
      throw new Error('Expected grouped search response validation to fail');
    }

    const message = formatLogThresholdSearchResponseError({
      searchResponse,
      validationErrors: decoded.left,
      responseType: 'grouped',
      errorContext: {
        indexPattern: 'logs-*',
        groupBy: ['host.name', 'service.name'],
      },
    });

    expect(message).toContain('logs-*');
    expect(message).toContain('observability:logSources');
    expect(message).toContain('host.name, service.name');
    expect(message).not.toContain('does not match expected type');
  });

  it('returns validation details for other grouped response validation failures', () => {
    const searchResponse = {
      ...baseSearchResponse,
      aggregations: {
        groups: {
          buckets: 'invalid',
        },
      },
    };

    const decoded = GroupedSearchQueryResponseRT.decode(searchResponse);
    expect(isLeft(decoded)).toBe(true);

    if (!isLeft(decoded)) {
      throw new Error('Expected grouped search response validation to fail');
    }

    const message = formatLogThresholdSearchResponseError({
      searchResponse,
      validationErrors: decoded.left,
      responseType: 'grouped',
      errorContext: {
        indexPattern: 'logs-*',
      },
    });

    expect(message).toContain('Failed to parse grouped search response');
  });

  it('returns a shard failure message when shards fail', () => {
    const searchResponse = {
      ...baseSearchResponse,
      _shards: {
        ...baseSearchResponse._shards,
        failed: 2,
      },
      aggregations: {
        groups: {
          buckets: [],
        },
      },
    };

    const message = formatLogThresholdSearchResponseError({
      searchResponse,
      validationErrors: [],
      responseType: 'grouped',
      errorContext: {
        indexPattern: 'logs-*',
      },
    });

    expect(message).toContain('2 failed shards');
    expect(message).toContain('observability:logSources');
  });
});
