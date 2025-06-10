/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { BulkDeleteParams, BulkDeleteResult } from '@kbn/slo-schema';
import pLimit from 'p-limit';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../../../common/constants';
import { DeleteSLO } from '../../delete_slo';

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
  rulesClient: RulesClientApi;
  deleteSLO: DeleteSLO;
  logger: Logger;
  abortController: AbortController;
}

export async function runBulkDelete(
  params: BulkDeleteParams,
  dependencies: Dependencies
): Promise<BulkDeleteResult[]> {
  const { scopedClusterClient, rulesClient, deleteSLO, logger, abortController } = dependencies;

  logger.debug(`Starting bulk deletion for SLO [${params.list.join(', ')}]`);

  const limiter = pLimit(3);

  const promises = params.list.map(async (sloId) => {
    return limiter(async () => {
      try {
        await deleteSLO.execute(sloId, { skipRuleDeletion: true, skipDataDeletion: true });
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

  const itemsDeletedSuccessfully = results
    .filter((result) => result.success === true)
    .map((result) => result.id);

  try {
    await Promise.all([
      scopedClusterClient.asCurrentUser.deleteByQuery(
        {
          index: SLI_DESTINATION_INDEX_PATTERN,
          refresh: false,
          wait_for_completion: false,
          conflicts: 'proceed',
          slices: 'auto',
          query: {
            bool: {
              filter: {
                terms: {
                  'slo.id': itemsDeletedSuccessfully,
                },
              },
            },
          },
        },
        { signal: abortController.signal }
      ),
      scopedClusterClient.asCurrentUser.deleteByQuery(
        {
          index: SUMMARY_DESTINATION_INDEX_PATTERN,

          refresh: false,
          wait_for_completion: false,
          conflicts: 'proceed',
          slices: 'auto',
          query: {
            bool: {
              filter: {
                terms: {
                  'slo.id': itemsDeletedSuccessfully,
                },
              },
            },
          },
        },
        { signal: abortController.signal }
      ),
    ]);
  } catch (err) {
    logger.debug(`Error scheduling tasks for data deletion: ${err}`);
  }

  try {
    await rulesClient.bulkDeleteRules({
      filter: `alert.attributes.params.sloId:(${itemsDeletedSuccessfully.join(' or ')})`,
    });
  } catch (err) {
    logger.debug(`Error deleting rules: ${err}`);
  }

  logger.debug(`completed bulk deletion: [${itemsDeletedSuccessfully.join(',')}]`);
  return results;
}
