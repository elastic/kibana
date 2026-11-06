/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import type { AttackWithAlertIds } from '@kbn/attack-discovery-schedules-common';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '@kbn/discoveries/impl/attack_discovery/alert_fields';

/**
 * Extracts the attacks actually created this run from the candidate alert
 * documents, pairing each created attack's id (`ALERT_UUID`) with the ids of the
 * underlying detection alerts it references (`ALERT_ATTACK_DISCOVERY_ALERT_IDS`).
 *
 * The result feeds `buildAlertIdToAttackIdsMap`, so the ad-hoc back-fill shares
 * the same aggregation as the scheduled path.
 */
export const extractCreatedAttacks = ({
  alertDocuments,
  createdDocumentIds,
}: {
  alertDocuments: Array<Record<string, unknown>>;
  createdDocumentIds: string[];
}): AttackWithAlertIds[] => {
  const createdIds = new Set(createdDocumentIds);

  return alertDocuments.flatMap((alertDocument) => {
    const attackId = alertDocument[ALERT_UUID] as string | undefined;

    if (attackId == null || !createdIds.has(attackId)) {
      return [];
    }

    const alertIds =
      (alertDocument[ALERT_ATTACK_DISCOVERY_ALERT_IDS] as string[] | undefined) ?? [];

    return [{ alertIds, attackId }];
  });
};
