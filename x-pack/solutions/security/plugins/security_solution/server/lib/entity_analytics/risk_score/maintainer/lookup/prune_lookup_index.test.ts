/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { RISK_SCORING_REQUEST_TIMEOUT } from '../../constants';
import { pruneLookupIndex } from './prune_lookup_index';

const params = {
  index: '.entity_analytics.risk_score.lookup-default',
  riskWindowStart: 'now-30d',
  calculationRunId: 'run-1',
};

describe('pruneLookupIndex', () => {
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  });

  it('deletes stale rows with conflicts proceeding and a long request timeout', async () => {
    (esClient.deleteByQuery as jest.Mock).mockResolvedValue({ deleted: 42, version_conflicts: 7 });

    await expect(pruneLookupIndex({ esClient, ...params })).resolves.toBe(42);

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: params.index,
        conflicts: 'proceed',
        refresh: true,
        query: {
          bool: {
            should: [
              { range: { '@timestamp': { lt: 'now-30d' } } },
              {
                bool: {
                  must: [{ exists: { field: 'calculation_run_id' } }],
                  must_not: [{ term: { calculation_run_id: 'run-1' } }],
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      }),
      { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
    );
  });

  it('returns 0 when nothing was deleted', async () => {
    (esClient.deleteByQuery as jest.Mock).mockResolvedValue({});

    await expect(pruneLookupIndex({ esClient, ...params })).resolves.toBe(0);
  });

  it('throws when the delete reports non-conflict failures', async () => {
    (esClient.deleteByQuery as jest.Mock).mockResolvedValue({
      deleted: 1,
      failures: [{ index: params.index, id: 'a', cause: { type: 'x' }, status: 500 }],
    });

    await expect(pruneLookupIndex({ esClient, ...params })).rejects.toThrow(
      'delete_by_query failed'
    );
  });
});
