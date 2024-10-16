/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import { EntityStoreUtils } from '../../utils';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';

export default ({ getService }: FtrProviderContextWithSpaces) => {
  const api = getService('securitySolutionApi');
  const spaces = getService('spaces');
  const namespace = uuidv4().substring(0, 8);
  const supertest = getService('supertest');
  const utils = EntityStoreUtils(getService, namespace);

  // Failing: See https://github.com/elastic/kibana/issues/196546
  describe.skip('@ess Entity Store Engine APIs in non-default space', () => {
    const dataView = dataViewRouteHelpersFactory(supertest, namespace);

    before(async () => {
      await utils.cleanEngines();
      await spaces.create({
        id: namespace,
        name: namespace,
        disabledFeatures: [],
      });
      await dataView.create('security-solution');
    });

    after(async () => {
      await dataView.delete('security-solution');
      await spaces.delete(namespace);
    });

    describe('init', () => {
      afterEach(async () => {
        await utils.cleanEngines();
      });

      it('should have installed the expected user resources', async () => {
        await utils.initEntityEngineForEntityType('user');
        await utils.expectEngineAssetsExist('user');
      });

      it('should have installed the expected host resources', async () => {
        await utils.initEntityEngineForEntityType('host');
        await utils.expectEngineAssetsExist('host');
      });
    });

    describe('get and list', () => {
      before(async () => {
        await Promise.all([
          utils.initEntityEngineForEntityType('host'),
          utils.initEntityEngineForEntityType('user'),
        ]);
      });

      after(async () => {
        await utils.cleanEngines();
      });

      describe('get', () => {
        it('should return the host entity engine', async () => {
          const getResponse = await api
            .getEntityEngine(
              {
                params: { entityType: 'host' },
              },
              namespace
            )
            .expect(200);

          expect(getResponse.body).to.eql({
            status: 'started',
            type: 'host',
            filter: '',
            fieldHistoryLength: 10,
            indexPattern: '',
          });
        });

        it('should return the user entity engine', async () => {
          const getResponse = await api
            .getEntityEngine(
              {
                params: { entityType: 'user' },
              },
              namespace
            )
            .expect(200);

          expect(getResponse.body).to.eql({
            status: 'started',
            type: 'user',
            filter: '',
            fieldHistoryLength: 10,
            indexPattern: '',
          });
        });
      });

      describe('list', () => {
        it('should return the list of entity engines', async () => {
          const { body } = await api.listEntityEngines(namespace).expect(200);

          // @ts-expect-error body is any
          const sortedEngines = body.engines.sort((a, b) => a.type.localeCompare(b.type));

          expect(sortedEngines).to.eql([
            {
              status: 'started',
              type: 'host',
              filter: '',
              fieldHistoryLength: 10,
              indexPattern: '',
            },
            {
              status: 'started',
              type: 'user',
              filter: '',
              fieldHistoryLength: 10,
              indexPattern: '',
            },
          ]);
        });
      });
    });

    describe('start and stop', () => {
      before(async () => {
        await utils.initEntityEngineForEntityType('host');
      });

      after(async () => {
        await utils.cleanEngines();
      });

      it('should stop the entity engine', async () => {
        await api
          .stopEntityEngine(
            {
              params: { entityType: 'host' },
            },
            namespace
          )
          .expect(200);

        const { body } = await api
          .getEntityEngine(
            {
              params: { entityType: 'host' },
            },
            namespace
          )
          .expect(200);

        expect(body.status).to.eql('stopped');
      });

      it('should start the entity engine', async () => {
        await api
          .startEntityEngine(
            {
              params: { entityType: 'host' },
            },
            namespace
          )
          .expect(200);

        const { body } = await api
          .getEntityEngine(
            {
              params: { entityType: 'host' },
            },
            namespace
          )
          .expect(200);

        expect(body.status).to.eql('started');
      });
    });

    describe('delete', () => {
      it('should delete the host entity engine', async () => {
        await utils.initEntityEngineForEntityType('host');

        await api
          .deleteEntityEngine(
            {
              params: { entityType: 'host' },
              query: { data: true },
            },
            namespace
          )
          .expect(200);

        await utils.expectEngineAssetsDoNotExist('host');
      });

      it('should delete the user entity engine', async () => {
        await utils.initEntityEngineForEntityType('user');

        await api
          .deleteEntityEngine(
            {
              params: { entityType: 'user' },
              query: { data: true },
            },
            namespace
          )
          .expect(200);

        await utils.expectEngineAssetsDoNotExist('user');
      });
    });
  });
};
