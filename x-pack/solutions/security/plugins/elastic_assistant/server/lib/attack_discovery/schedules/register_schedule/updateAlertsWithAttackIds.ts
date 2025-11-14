/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_ATTACK_IDS } from '../fields';

export interface UpdateAlertsWithAttackIdsParams {
  esClient: ElasticsearchClient;
  alertIdToAttackIdsMap: Record<string, string[]>;
}

export async function updateAlertsWithAttackIds({
  esClient,
  alertIdToAttackIdsMap,
}: UpdateAlertsWithAttackIdsParams) {
  await esClient.updateByQuery({
    index: '.alerts-security.alerts-default',
    query: {
      ids: {
        values: Array.from(Object.keys(alertIdToAttackIdsMap)),
      },
    },
    script: {
      lang: 'painless',
      params: {
        alertIdToAttackIds: alertIdToAttackIdsMap,
      },
      source: `
          def alertId = ctx._id;
          def attacksToAdd = params.alertIdToAttackIds.get(alertId);

          if (attacksToAdd != null) {
            if (ctx._source['${ALERT_ATTACK_IDS}'] == null) {
              ctx._source['${ALERT_ATTACK_IDS}'] = new ArrayList();
            }

            for (attack in attacksToAdd) {
              if (!ctx._source['${ALERT_ATTACK_IDS}'].contains(attack)) {
                ctx._source['${ALERT_ATTACK_IDS}'].add(attack);
              }
            }
          }
        `,
    },
  });
}
