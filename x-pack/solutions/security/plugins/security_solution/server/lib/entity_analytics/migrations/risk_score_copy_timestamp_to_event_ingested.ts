/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsMigrationsParams } from '.';
import { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../risk_score/tasks/helpers';

const TASK_TYPE = 'security-solution-ea-risk-score-copy-timestamp-to-event-ingested';
const TASK_ID = `${TASK_TYPE}-task-id`;
const TASK_TIMEOUT = '15m';
const TASK_SCOPE = ['securitySolution'];

export const riskScoreCopyTimestampToEventIngested = async ({
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
      title: `Copy Risk Score @timestamp value to events.ingested`,
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
        const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace: '*' });

        const riskScoreClient = new RiskScoreDataClient({
          esClient,
          logger,
          auditLogger,
          namespace: '*',
          soClient,
          kibanaVersion: '*',
        });
        const riskScoreResponse = await riskScoreClient.copyTimestampToEventIngestedForRiskScore(
          abortController.signal
        );
        const failures = riskScoreResponse.failures?.map((failure) => failure.cause);
        const hasFailures = failures && failures?.length > 0;

        logger.info(
          `Task "${TASK_TYPE}" finished. Updated documents: ${
            riskScoreResponse.updated
          }, failures: ${hasFailures ? failures.join('\n') : 0}`
        );
      },

      cancel: async () => {
        abortController.abort();
        logger.debug(`Task cancelled: "${TASK_TYPE}"`);
      },
    };
  };
