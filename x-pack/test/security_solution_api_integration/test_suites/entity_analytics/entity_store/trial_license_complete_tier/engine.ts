/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';
import { EntityStoreUtils } from '../../utils';
export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');

  const utils = EntityStoreUtils(getService);

  describe('@ess @serverless @skipInServerlessMKI Entity Store Engine APIs', () => {
    before(async () => {
      await utils.cleanEngines();
    });

    describe('init', () => {
      afterEach(async () => {
        await utils.cleanEngines();
      });

      it('should have installed the expected user resources', async () => {
        await utils.initEntityEngineForEntityType('user');

        const expectedTransforms = ['entities-v1-latest-ea_default_user_entity_store'];

        await utils.expectTransformsExist(expectedTransforms);
      });

      it('should have installed the expected host resources', async () => {
        await utils.initEntityEngineForEntityType('host');

        const expectedTransforms = ['entities-v1-latest-ea_default_host_entity_store'];

        await utils.expectTransformsExist(expectedTransforms);
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
            .getEntityEngine({
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
            .getEntityEngine({
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
          const { body } = await api.listEntityEngines().expect(200);

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
        await utils.initEntityEngineForEntityType('host');
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
        await utils.initEntityEngineForEntityType('host');

        await api
          .deleteEntityEngine({
            params: { entityType: 'host' },
            query: { data: true },
          })
          .expect(200);

        await utils.expectTransformNotFound('entities-v1-latest-ea_host_entity_store');
      });

      it('should delete the user entity engine', async () => {
        await utils.initEntityEngineForEntityType('user');

        await api
          .deleteEntityEngine({
            params: { entityType: 'user' },
            query: { data: true },
          })
          .expect(200);

        await utils.expectTransformNotFound('entities-v1-latest-ea_user_entity_store');
      });
    });
  });
};
