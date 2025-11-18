/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { updateAlertsWithAttackIds } from './updateAlertsWithAttackIds';
import { ALERT_ATTACK_IDS } from '../fields';

describe('updateAlertsWithAttackIds', () => {
  const spaceId = 'default';
  const esClient = elasticsearchClientMock.createElasticsearchClient();
  const alertIdToAttackIdsMap = {
    'alert-id-1': ['attack-1'],
    'alert-id-2': ['attack-2'],
    'alert-id-3': ['attack-1', 'attack-2'],
  };

  describe('Happy path', () => {
    beforeAll(async () => {
      await updateAlertsWithAttackIds({
        alertIdToAttackIdsMap,
        esClient,
        spaceId,
      });
    });

    it('should use the `updateByQuery` method from esClient', () => {
      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
    });

    it('should call `updateByQuery` with the expected params', () => {
      expect(esClient.updateByQuery).toHaveBeenCalledWith({
        index: '.alerts-security.alerts-default',
        query: {
          ids: {
            values: ['alert-id-1', 'alert-id-2', 'alert-id-3'],
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
    });
  });
  describe('Edge-cases', () => {
    beforeEach(() => {
      esClient.updateByQuery.mockReset();
    });

    it('should throw if an empty spaceId is being used', () => {
      expect(async () => {
        await updateAlertsWithAttackIds({ esClient, alertIdToAttackIdsMap, spaceId: '' });
      }).rejects.toThrow();
    });

    it('should not call `updateByQuery` if there are no alerts to be updated', async () => {
      await updateAlertsWithAttackIds({ esClient, spaceId, alertIdToAttackIdsMap: {} });

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(0);
    });
  });
});
