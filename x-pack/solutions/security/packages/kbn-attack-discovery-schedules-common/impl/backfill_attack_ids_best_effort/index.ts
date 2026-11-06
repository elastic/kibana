/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALERT_ATTACK_IDS } from '../fields/field_names';
import { updateAlertsWithAttackIds } from '../update_alerts_with_attack_ids';

export interface BackfillAttackIdsBestEffortParams {
  alertIdToAttackIdsMap: Record<string, string[]>;
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
}

/**
 * Best-effort wrapper around `updateAlertsWithAttackIds`. Both AD 2.0
 * persistence paths (ad-hoc `_validate` and scheduled `workflow_executor`) use
 * this so the back-fill cannot diverge and — critically — so a failure to
 * stamp `${ALERT_ATTACK_IDS}` onto the underlying detection alerts never
 * hard-fails an otherwise-successful generation. On failure the attacks have
 * already been persisted; only the convenience grouping on the Attacks page is
 * affected, so we swallow the error and log a prominent warning instead.
 */
export const backfillAttackIdsBestEffort = async ({
  alertIdToAttackIdsMap,
  esClient,
  logger,
  spaceId,
}: BackfillAttackIdsBestEffortParams): Promise<void> => {
  try {
    await updateAlertsWithAttackIds({ alertIdToAttackIdsMap, esClient, spaceId });
  } catch (err) {
    const affectedAlertIds = Object.keys(alertIdToAttackIdsMap);

    logger.warn(
      `[kibana-dkv] Best-effort back-fill of ${ALERT_ATTACK_IDS} failed for ${
        affectedAlertIds.length
      } detection alert(s); the attack discoveries were still generated. Affected alert ids: ${affectedAlertIds.join(
        ', '
      )}. Error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};
