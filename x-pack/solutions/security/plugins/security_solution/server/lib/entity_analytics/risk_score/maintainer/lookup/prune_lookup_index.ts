/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

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
  const response = await esClient.deleteByQuery({
    index,
    refresh: true,
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
  });

  return response.deleted ?? 0;
};
