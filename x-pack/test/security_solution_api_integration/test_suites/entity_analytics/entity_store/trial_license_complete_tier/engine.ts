/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { EntityType } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/common.gen';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { cleanEngines } from '../../utils';
export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const es = getService('es');

  const initEntityEngineForEntityType = async (entityType: EntityType) => {
    return api
      .initEntityStore({
        params: { entityType },
        body: {},
      })
      .expect(200);
  };

  const expectTransformExists = async (transformId: string) => {
    return expectTransformStatus(transformId, true);
  };

  const expectTransformNotFound = async (transformId: string, attempts: number = 5) => {
    return expectTransformStatus(transformId, false);
  };

  const expectTransformStatus = async (
    transformId: string,
    exists: boolean,
    attempts: number = 5,
    delayMs: number = 2000
  ) => {
    let currentAttempt = 1;
    while (currentAttempt <= attempts) {
      try {
        await es.transform.getTransform({ transform_id: transformId });
        if (!exists) {
          throw new Error(`Expected transform ${transformId} to not exist, but it does`);
        }
        return; // Transform exists, exit the loop
      } catch (e) {
        if (currentAttempt === attempts) {
          if (exists) {
            throw new Error(`Expected transform ${transformId} to exist, but it does not: ${e}`);
          } else {
            return; // Transform does not exist, exit the loop
          }
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        currentAttempt++;
      }
    }
  };

  const expectTransformsExist = async (transformIds: string[]) =>
    Promise.all(transformIds.map((id) => expectTransformExists(id)));

  describe('@ess @serverless @skipInServerlessMKI Entity Store Engine APIs', () => {
    before(async () => {
      await cleanEngines({ getService });
    });

    describe('init', () => {
      afterEach(async () => {
        await cleanEngines({ getService });
      });

      it('should have installed the expected user resources', async () => {
        await initEntityEngineForEntityType('user');

        const expectedTransforms = [
          'entities-v1-history-ea_user_entity_store',
          'entities-v1-latest-ea_user_entity_store',
        ];

        await expectTransformsExist(expectedTransforms);
      });

      it('should have installed the expected host resources', async () => {
        await initEntityEngineForEntityType('host');

        const expectedTransforms = [
          'entities-v1-history-ea_host_entity_store',
          'entities-v1-latest-ea_host_entity_store',
        ];

        await expectTransformsExist(expectedTransforms);
      });
    });

    describe('get and list', () => {
      before(async () => {
        await Promise.all([
          initEntityEngineForEntityType('host'),
          initEntityEngineForEntityType('user'),
        ]);
      });

      after(async () => {
        await cleanEngines({ getService });
      });

      describe('get', () => {
        it('should return the host entity engine', async () => {
          const getResponse = await api
            .getEntityStoreEngine({
              params: { entityType: 'host' },
            })
            .expect(200);

          expect(getResponse.body).to.eql({
            status: 'started',
            type: 'host',
            indexPattern:
              'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
            filter: '',
          });
        });

        it('should return the user entity engine', async () => {
          const getResponse = await api
            .getEntityStoreEngine({
              params: { entityType: 'user' },
            })
            .expect(200);

          expect(getResponse.body).to.eql({
            status: 'started',
            type: 'user',
            indexPattern:
              'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
            filter: '',
          });
        });
      });

      describe('list', () => {
        it('should return the list of entity engines', async () => {
          const { body } = await api.listEntityStoreEngines().expect(200);

          // @ts-expect-error body is any
          const sortedEngines = body.engines.sort((a, b) => a.type.localeCompare(b.type));

          expect(sortedEngines).to.eql([
            {
              status: 'started',
              type: 'host',
              indexPattern:
                'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              filter: '',
            },
            {
              status: 'started',
              type: 'user',
              indexPattern:
                'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*',
              filter: '',
            },
          ]);
        });
      });
    });

    describe('start and stop', () => {
      before(async () => {
        await initEntityEngineForEntityType('host');
      });

      after(async () => {
        await cleanEngines({ getService });
      });

      it('should stop the entity engine', async () => {
        await api
          .stopEntityStore({
            params: { entityType: 'host' },
          })
          .expect(200);

        const { body } = await api
          .getEntityStoreEngine({
            params: { entityType: 'host' },
          })
          .expect(200);

        expect(body.status).to.eql('stopped');
      });

      it('should start the entity engine', async () => {
        await api
          .startEntityStore({
            params: { entityType: 'host' },
          })
          .expect(200);

        const { body } = await api
          .getEntityStoreEngine({
            params: { entityType: 'host' },
          })
          .expect(200);

        expect(body.status).to.eql('started');
      });
    });

    describe('delete', () => {
      it('should delete the host entity engine', async () => {
        await initEntityEngineForEntityType('host');

        await api
          .deleteEntityStore({
            params: { entityType: 'host' },
            query: { data: true },
          })
          .expect(200);

        await expectTransformNotFound('entities-v1-history-ea_host_entity_store');
        await expectTransformNotFound('entities-v1-latest-ea_host_entity_store');
      });

      it('should delete the user entity engine', async () => {
        await initEntityEngineForEntityType('user');

        await api
          .deleteEntityStore({
            params: { entityType: 'user' },
            query: { data: true },
          })
          .expect(200);

        await expectTransformNotFound('entities-v1-history-ea_user_entity_store');
        await expectTransformNotFound('entities-v1-latest-ea_user_entity_store');
      });
    });
  });
};
