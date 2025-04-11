/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import pLimit from 'p-limit';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardPipelineId,
} from '../../../../common/constants';
import { retryTransientEsErrors } from '../../../utils/retry';
import { SLORepository } from '../../slo_repository';
import { TransformManager } from '../../transform_manager';
import { SLODefinition } from '../../../domain/models';

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
  rulesClient: RulesClientApi;
  repository: SLORepository;
  transformManager: TransformManager;
  summaryTransformManager: TransformManager;
  logger: Logger;
  abortController: AbortController;
}

export async function runBulkDelete(
  params: { list: string[] },
  {
    scopedClusterClient,
    rulesClient,
    repository,
    transformManager,
    summaryTransformManager,
    logger,
  }: Dependencies
) {
  logger.debug(`running bulk deletion for SLO [${params.list.join(', ')}]`);
  const limiter = pLimit(5);

  const promises = params.list.map(async (sloId) => {
    return limiter(async () => {
      let slo: SLODefinition;
      try {
        slo = await repository.findById(sloId);
      } catch (err) {
        return {
          id: sloId,
          success: false,
          error: err.message,
        };
      }

      try {
        const rollupTransformId = getSLOTransformId(slo.id, slo.revision);
        const summaryTransformId = getSLOSummaryTransformId(slo.id, slo.revision);

        await Promise.all([
          transformManager.uninstall(rollupTransformId),
          summaryTransformManager.uninstall(summaryTransformId),
          retryTransientEsErrors(() =>
            scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline(
              { id: getWildcardPipelineId(slo.id, slo.revision) },
              { ignore: [404] }
            )
          ),
          repository.deleteById(slo.id, { ignoreNotFound: true }),
        ]);
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

  const itemsDeleted = results
    .filter((result) => result.success === true)
    .map((result) => result.id);

  await Promise.all([
    scopedClusterClient.asCurrentUser.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      refresh: false,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: {
            terms: {
              'slo.id': itemsDeleted,
            },
          },
        },
      },
    }),
    scopedClusterClient.asCurrentUser.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: false,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: {
            terms: {
              'slo.id': itemsDeleted,
            },
          },
        },
      },
    }),
  ]);

  try {
    await rulesClient.bulkDeleteRules({
      filter: `alert.attributes.params.sloId:${itemsDeleted.join(' or ')}`,
    });
  } catch (err) {
    // no-op
  }

  logger.info(`completed bulk deletion: [${itemsDeleted.join(',')}]`);
  return results;
}
