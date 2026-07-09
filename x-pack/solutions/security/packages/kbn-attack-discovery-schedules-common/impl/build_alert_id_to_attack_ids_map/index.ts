/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AttackWithAlertIds {
  alertIds: string[];
  attackId: string;
}

/**
 * Inverts a set of attacks (each with its own id and the ids of the underlying
 * detection alerts it references) into a map of detection alert id -> attack
 * ids, aggregating attacks that share the same underlying alert.
 *
 * The resulting map is consumed by `updateAlertsWithAttackIds` to back-fill the
 * `kibana.alert.attack_ids` field on the original detection alerts. Both the
 * scheduled and ad-hoc Attack discovery persistence paths use this so their
 * back-fill behavior cannot diverge.
 */
export const buildAlertIdToAttackIdsMap = ({
  attacks,
}: {
  attacks: AttackWithAlertIds[];
}): Record<string, string[]> =>
  attacks.reduce<Record<string, string[]>>(
    (acc, { alertIds, attackId }) =>
      alertIds.reduce(
        (innerAcc, alertId) => ({
          ...innerAcc,
          [alertId]: [...(innerAcc[alertId] ?? []), attackId],
        }),
        acc
      ),
    {}
  );
