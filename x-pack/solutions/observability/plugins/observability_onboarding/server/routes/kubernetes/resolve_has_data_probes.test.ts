/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import { resolveProbe } from './resolve_has_data_probes';

const fulfilledWithHits = (count: number): PromiseSettledResult<estypes.SearchResponse> => ({
  status: 'fulfilled',
  value: {
    hits: { total: { value: count, relation: 'eq' }, max_score: null, hits: [] },
  } as unknown as estypes.SearchResponse,
});

const rejectedWith = (error: Error): PromiseSettledResult<estypes.SearchResponse> => ({
  status: 'rejected',
  reason: error,
});

const noShardsError = () => {
  const error = new errors.ResponseError({
    statusCode: 503,
    body: {
      error: {
        type: 'search_phase_execution_exception',
        root_cause: [{ type: 'no_shard_available_action_exception' }],
      },
    },
    headers: {},
    warnings: [],
    meta: {} as never,
  });
  return error;
};

describe('resolveProbe', () => {
  it('returns true when documents are found', () => {
    expect(resolveProbe(fulfilledWithHits(1))).toBe(true);
  });

  it('returns false when no documents are found', () => {
    expect(resolveProbe(fulfilledWithHits(0))).toBe(false);
  });

  it('returns false on no shards available error', () => {
    expect(resolveProbe(rejectedWith(noShardsError()))).toBe(false);
  });

  it('throws on unexpected errors', () => {
    expect(() => resolveProbe(rejectedWith(new Error('Request timed out')))).toThrow(
      'Elasticsearch responded with an error. Request timed out'
    );
  });

  describe('combined classic + wired stream probes', () => {
    it('returns true when classic probe finds data and wired probe finds nothing', () => {
      const hasLogs = resolveProbe(fulfilledWithHits(1)) || resolveProbe(fulfilledWithHits(0));
      expect(hasLogs).toBe(true);
    });

    it('returns true when classic probe finds nothing but wired probe finds data', () => {
      const hasLogs = resolveProbe(fulfilledWithHits(0)) || resolveProbe(fulfilledWithHits(1));
      expect(hasLogs).toBe(true);
    });

    it('returns false when both probes find nothing', () => {
      const hasLogs = resolveProbe(fulfilledWithHits(0)) || resolveProbe(fulfilledWithHits(0));
      expect(hasLogs).toBe(false);
    });

    it('handles optional wired probe (undefined when no start time)', () => {
      const wiredResult: PromiseSettledResult<estypes.SearchResponse> | undefined = undefined;
      const hasLogs =
        resolveProbe(fulfilledWithHits(0)) || (wiredResult ? resolveProbe(wiredResult) : false);
      expect(hasLogs).toBe(false);
    });
  });
});
