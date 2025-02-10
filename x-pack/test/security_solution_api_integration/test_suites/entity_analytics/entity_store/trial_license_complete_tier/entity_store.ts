/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { defaultOptions } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_store/constants';
import { omit } from 'lodash/fp';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { EntityStoreUtils } from '../../utils';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');

  const utils = EntityStoreUtils(getService);
  describe('@ess @skipInServerlessMKI Entity Store APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);

    const defaults = omit('docsPerSecond', defaultOptions);

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

    describe('init error handling', () => {
      afterEach(async () => {
        await dataView.create('security-solution');
        await utils.cleanEngines();
      });

      it('should return "error" when the security data view does not exist', async () => {
        await dataView.delete('security-solution');
        await utils.initEntityEngineForEntityType('host');
        await utils.waitForEngineStatus('host', 'error');
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

          expect(getResponse.body).toEqual({
            ...defaults,
            status: 'started',
            type: 'host',
          });
        });

        it('should return the user entity engine', async () => {
          const getResponse = await api
            .getEntityEngine({
              params: { entityType: 'user' },
            })
            .expect(200);

          expect(getResponse.body).toEqual({
            ...defaults,
            status: 'started',
            type: 'user',
          });
        });
      });

      describe('list', () => {
        it('should return the list of entity engines', async () => {
          const { body } = await api.listEntityEngines().expect(200);

          // @ts-expect-error body is any
          const sortedEngines = body.engines.sort((a, b) => a.type.localeCompare(b.type));

          expect(sortedEngines).toEqual([
            {
              ...defaults,
              status: 'started',
              type: 'host',
            },
            {
              ...defaults,
              status: 'started',
              type: 'user',
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

        expect(body.status).toEqual('stopped');
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

        expect(body.status).toEqual('started');
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

    // FLAKY: https://github.com/elastic/kibana/issues/200758
    describe.skip('status', () => {
      afterEach(async () => {
        await utils.cleanEngines();
      });

      it('should return "not_installed" when no engines have been initialized', async () => {
        const { body } = await api.getEntityStoreStatus({ query: {} }).expect(200);

        expect(body).toEqual({
          engines: [],
          status: 'not_installed',
        });
      });

      it('should return "installing" when at least one engine is being initialized', async () => {
        await utils.enableEntityStore();

        const { body } = await api.getEntityStoreStatus({ query: {} }).expect(200);

        expect(body.status).toEqual('installing');
        expect(body.engines.length).toEqual(2);
        expect(body.engines[0].status).toEqual('installing');
        expect(body.engines[1].status).toEqual('installing');
      });

      it('should return "started" when all engines are started', async () => {
        await utils.initEntityEngineForEntityTypesAndWait(['host', 'user']);

        const { body } = await api.getEntityStoreStatus({ query: {} }).expect(200);

        expect(body.status).toEqual('running');
        expect(body.engines.length).toEqual(2);
        expect(body.engines[0].status).toEqual('started');
        expect(body.engines[1].status).toEqual('started');
      });

      describe('status with components', () => {
        it('should return empty list when when no engines have been initialized', async () => {
          const { body } = await api
            .getEntityStoreStatus({ query: { include_components: true } })
            .expect(200);

          expect(body).toEqual({
            engines: [],
            status: 'not_installed',
          });
        });

        it('should return components status when engines are installed', async () => {
          await utils.initEntityEngineForEntityTypesAndWait(['host']);

          const { body } = await api
            .getEntityStoreStatus({ query: { include_components: true } })
            .expect(200);

          expect(body.engines[0].components).toEqual([
            expect.objectContaining({ resource: 'entity_definition' }),
            expect.objectContaining({ resource: 'transform' }),
            expect.objectContaining({ resource: 'ingest_pipeline' }),
            expect.objectContaining({ resource: 'index_template' }),
            expect.objectContaining({ resource: 'task' }),
            expect.objectContaining({ resource: 'ingest_pipeline' }),
            expect.objectContaining({ resource: 'enrich_policy' }),
            expect.objectContaining({ resource: 'index' }),
            expect.objectContaining({ resource: 'component_template' }),
          ]);
        });
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/209010
    describe.skip('apply_dataview_indices', () => {
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

        expect(response.body).toEqual({ success: true, result: [{ type: 'host', changes: {} }] });
      });

      it('should update the index pattern when the data view changes', async () => {
        await dataView.updateIndexPattern('security-solution', 'test-*');
        const response = await api.applyEntityEngineDataviewIndices();

        expect(response.body).toEqual({
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
