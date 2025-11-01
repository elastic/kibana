/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { BulkOperationParams, BulkOperationResult } from '@kbn/slo-schema';
import pLimit from 'p-limit';
import type { ResetSLO } from '../../reset_slo';

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
  rulesClient: RulesClientApi;
  resetSLO: ResetSLO;
  logger: Logger;
  abortController: AbortController;
}

export async function runBulkReset(
  params: BulkOperationParams,
  dependencies: Dependencies
): Promise<BulkOperationResult[]> {
  const { resetSLO, logger } = dependencies;

  logger.debug(`Starting bulk deletion for SLO [${params.list.join(', ')}]`);

  const limiter = pLimit(3);

  const promises = params.list.map(async (sloId) => {
    return limiter(async () => {
      try {
        await resetSLO.execute(sloId);
      } catch (err) {
        return {
          id: sloId,
          success: false,
          error: err.message,
        };
      }

      return { id: sloId, success: true };
    });
  });

  const results = await Promise.all(promises);

  const itemsResetSuccessfully = results
    .filter((result) => result.success === true)
    .map((result) => result.id);

  logger.debug(`completed bulk reset: [${itemsResetSuccessfully.join(',')}]`);
  return results;
}
