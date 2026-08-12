/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Logger } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { EntityMaintainerTaskStatus } from '@kbn/entity-store/server';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';

const RISK_SCORE_MAINTAINER_ID = 'risk-score';

/**
 * Checks the status of the risk-score entity maintainer.
 * If the maintainer is stopped, also returns how long ago it last ran successfully.
 */
export const fetchRiskScoreGrounding = async ({
  entityStore,
  namespace,
  logger,
}: {
  entityStore: EntityStoreStartContract;
  namespace: string;
  logger: Logger;
}) => {
  try {
    const grounding = await getRiskScoreMaintainerStatus({ entityStore, namespace });
    return {
      tool_result_id: getToolResultId(),
      type: ToolResultType.other,
      data: { riskScoreGrounding: grounding },
    };
  } catch (error) {
    logger.debug(
      `Failed to fetch risk score grounding: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

const getRiskScoreMaintainerStatus = async ({
  entityStore,
  namespace,
}: {
  entityStore: EntityStoreStartContract;
  namespace: string;
}): Promise<{ status: EntityMaintainerTaskStatus; lastScoreTimeAgo?: string }> => {
  const [maintainer] = await entityStore.getMaintainerStatus(namespace, [RISK_SCORE_MAINTAINER_ID]);

  const status = maintainer?.taskStatus ?? EntityMaintainerTaskStatus.NEVER_STARTED;

  if (status === EntityMaintainerTaskStatus.STOPPED) {
    return {
      status,
      lastScoreTimeAgo: maintainer?.lastSuccessTimestamp
        ? moment(maintainer.lastSuccessTimestamp).fromNow()
        : undefined,
    };
  }

  return { status };
};
