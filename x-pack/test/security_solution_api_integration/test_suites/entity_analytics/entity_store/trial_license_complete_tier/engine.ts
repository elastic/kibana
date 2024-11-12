/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { EntityStoreUtils } from '../../utils';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');

  const utils = EntityStoreUtils(getService);
  describe('@ess @skipInServerlessMKI Entity Store Engine APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);

    before(async () => {
      await utils.cleanEngines();
      await dataView.create('security-solution');
    });

    after(async () => {
      await dataView.delete('security-solution');
    });

    describe('init', () => {
      afterEach(async () => {
        await utils.cleanEngines();
      });

      it('should have installed the expected user resources', async () => {
        await utils.initEntityEngineForEntityTypesAndWait(['user']);
        await utils.expectEngineAssetsExist('user');
      });

      it('should have installed the expected host resources', async () => {
        await utils.initEntityEngineForEntityTypesAndWait(['host']);
        await utils.expectEngineAssetsExist('host');
      });
    });

    describe('enablement', () => {
      afterEach(async () => {
        await utils.cleanEngines();
      });

      it('should enable the entity store, creating both user and host engines', async () => {
        await utils.enableEntityStore();
        await utils.expectEngineAssetsExist('user');
        await utils.expectEngineAssetsExist('host');
      });
    });

    describe('get and list', () => {
      before(async () => {
        await utils.initEntityEngineForEntityTypesAndWait(['host', 'user']);
      });

      after(async () => {
        await utils.cleanEngines();
      });

      describe('get', () => {
        it('should return the host entity engine', async () => {
          const getResponse = await api
            .getEntityEngine({
              params: { entityType: 'host' },
            })
            .expect(200);

          expect(getResponse.body).to.eql({
            status: 'started',
            type: 'host',
            indexPattern: '',
            filter: '',
            fieldHistoryLength: 10,
          });
        });

        it('should return the user entity engine', async () => {
          const getResponse = await api
            .getEntityEngine({
              params: { entityType: 'user' },
            })
            .expect(200);

          expect(getResponse.body).to.eql({
            status: 'started',
            type: 'user',
            indexPattern: '',
            filter: '',
            fieldHistoryLength: 10,
          });
        });
      });

      describe('list', () => {
        it('should return the list of entity engines', async () => {
          const { body } = await api.listEntityEngines().expect(200);

          // @ts-expect-error body is any
          const sortedEngines = body.engines.sort((a, b) => a.type.localeCompare(b.type));

          expect(sortedEngines).to.eql([
            {
              status: 'started',
              type: 'host',
              indexPattern: '',
              filter: '',
              fieldHistoryLength: 10,
            },
            {
              status: 'started',
              type: 'user',
              indexPattern: '',
              filter: '',
              fieldHistoryLength: 10,
            },
          ]);
        });
      });
    });

    describe('start and stop', () => {
      before(async () => {
        await utils.initEntityEngineForEntityTypesAndWait(['host']);
      });

      after(async () => {
        await utils.cleanEngines();
      });

      it('should stop the entity engine', async () => {
        await api
          .stopEntityEngine({
            params: { entityType: 'host' },
          })
          .expect(200);

        const { body } = await api
          .getEntityEngine({
            params: { entityType: 'host' },
          })
          .expect(200);

        expect(body.status).to.eql('stopped');
      });

      it('should start the entity engine', async () => {
        await api
          .startEntityEngine({
            params: { entityType: 'host' },
          })
          .expect(200);

        const { body } = await api
          .getEntityEngine({
            params: { entityType: 'host' },
          })
          .expect(200);

        expect(body.status).to.eql('started');
      });
    });

    describe('delete', () => {
      it('should delete the host entity engine', async () => {
        await utils.initEntityEngineForEntityTypesAndWait(['host']);

        await api
          .deleteEntityEngine({
            params: { entityType: 'host' },
            query: { data: true },
          })
          .expect(200);

        await utils.expectEngineAssetsDoNotExist('host');
      });

      it('should delete the user entity engine', async () => {
        await utils.initEntityEngineForEntityTypesAndWait(['user']);

        await api
          .deleteEntityEngine({
            params: { entityType: 'user' },
            query: { data: true },
          })
          .expect(200);

        await utils.expectEngineAssetsDoNotExist('user');
      });
    });

    describe('apply_dataview_indices', () => {
      before(async () => {
        await utils.initEntityEngineForEntityTypesAndWait(['host']);
      });

      after(async () => {
        await utils.cleanEngines();
      });

      afterEach(async () => {
        await dataView.delete('security-solution');
        await dataView.create('security-solution');
      });

      it("should not update the index patten when it didn't change", async () => {
        const response = await api.applyEntityEngineDataviewIndices();

        expect(response.body).to.eql({ success: true, result: [{ type: 'host', changes: {} }] });
      });

      it('should update the index pattern when the data view changes', async () => {
        await dataView.updateIndexPattern('security-solution', 'test-*');
        const response = await api.applyEntityEngineDataviewIndices();

        expect(response.body).to.eql({
          success: true,
          result: [
            {
              type: 'host',
              changes: {
                indexPatterns: [
                  'test-*',
                  '.asset-criticality.asset-criticality-default',
                  'risk-score.risk-score-latest-default',
                ],
              },
            },
          ],
        });
      });
    });
  });
};
