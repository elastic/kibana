/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RISK_SCORING_REQUEST_TIMEOUT } from '../../constants';

/**
 * Deletes lookup rows that are outside the risk window or were written by an earlier run.
 *
 * Entity types prune concurrently with identical queries, so the same stale documents are
 * routinely deleted by another request mid-scan. `conflicts: 'proceed'` counts those as
 * skipped instead of aborting on the first one, which previously left the index unpruned on
 * every run. Non-conflict failures are still surfaced.
 */
export const pruneLookupIndex = async ({
  esClient,
  index,
  riskWindowStart,
  calculationRunId,
}: {
  esClient: ElasticsearchClient;
  index: string;
  riskWindowStart: string;
  calculationRunId: string;
}): Promise<number> => {
  const response = await esClient.deleteByQuery(
    {
      index,
      refresh: true,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          should: [
            {
              range: {
                '@timestamp': {
                  lt: riskWindowStart,
                },
              },
            },
            {
              bool: {
                must: [{ exists: { field: 'calculation_run_id' } }],
                must_not: [{ term: { calculation_run_id: calculationRunId } }],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    },
    { requestTimeout: RISK_SCORING_REQUEST_TIMEOUT }
  );

  if (response.failures?.length) {
    throw new Error(
      `delete_by_query failed: ${JSON.stringify({
        deleted: response.deleted,
        failures: response.failures.slice(0, 3),
      })}`
    );
  }

  return response.deleted ?? 0;
};
