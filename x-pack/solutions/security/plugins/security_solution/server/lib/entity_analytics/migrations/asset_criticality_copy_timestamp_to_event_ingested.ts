/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsMigrationsParams } from '.';
import { AssetCriticalityMigrationClient } from '../asset_criticality/asset_criticality_migration_client';

const TASK_TYPE = 'security-solution-ea-asset-criticality-copy-timestamp-to-event-ingested';
const TASK_ID = `${TASK_TYPE}-task-id`;
const TASK_TIMEOUT = '15m';
const TASK_SCOPE = ['securitySolution'];

export const assetCrticalityCopyTimestampToEventIngested = async ({
  auditLogger,
  taskManager,
  logger,
  getStartServices,
}: EntityAnalyticsMigrationsParams) => {
  if (!taskManager) {
    return;
  }

  logger.debug(`Register task "${TASK_TYPE}"`);

  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: `Copy Asset Criticality @timestamp value to events.ingested`,
      timeout: TASK_TIMEOUT,
      createTaskRunner: createMigrationTask({ auditLogger, logger, getStartServices }),
    },
  });

  const [_, depsStart] = await getStartServices();
  const taskManagerStart = depsStart.taskManager;

  if (taskManagerStart) {
    logger.debug(`Task scheduled: "${TASK_TYPE}"`);

    const now = new Date();
    try {
      await taskManagerStart.ensureScheduled({
        id: TASK_ID,
        taskType: TASK_TYPE,
        scheduledAt: now,
        runAt: now,
        scope: TASK_SCOPE,
        params: {},
        state: {},
      });
    } catch (e) {
      logger.error(`Error scheduling ${TASK_ID}, received ${e.message}`);
    }
  }
};

export const createMigrationTask =
  ({
    getStartServices,
    logger,
    auditLogger,
  }: Pick<EntityAnalyticsMigrationsParams, 'getStartServices' | 'logger' | 'auditLogger'>) =>
  () => {
    let abortController: AbortController;
    return {
      run: async () => {
        abortController = new AbortController();
        const [coreStart] = await getStartServices();
        const esClient = coreStart.elasticsearch.client.asInternalUser;
        const assetCrticalityClient = new AssetCriticalityMigrationClient({
          esClient,
          logger,
          auditLogger,
        });

        const assetCriticalityResponse =
          await assetCrticalityClient.copyTimestampToEventIngestedForAssetCriticality(
            abortController.signal
          );

        const failures = assetCriticalityResponse.failures?.map((failure) => failure.cause);
        const hasFailures = failures && failures?.length > 0;

        logger.info(
          `Task "${TASK_TYPE}" finished. Updated documents: ${
            assetCriticalityResponse.updated
          }, failures: ${hasFailures ? failures.join('\n') : 0}`
        );
      },

      cancel: async () => {
        abortController.abort();
        logger.debug(`Task cancelled: "${TASK_TYPE}"`);
      },
    };
  };
