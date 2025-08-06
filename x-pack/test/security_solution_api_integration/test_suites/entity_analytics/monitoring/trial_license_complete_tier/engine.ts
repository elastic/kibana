/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { enablePrivmonSetting } from '../../utils';
import { PrivMonUtils } from './privileged_users/utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const privMonUtils = PrivMonUtils(getService); 
  const log = getService('log');
  const es = getService('es');
  const retry = getService('retry');

  const waitForPrivMonUsersToBeSynced = async () => {
    retry.waitForWithTimeout('Wait for PrivMon users to be synced', 40000, async () => {
      const res = await api.listPrivMonUsers({ query: {} });
      return res.body.length > 0; // wait until we have at least one user
    });
  };

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    before(async () => {
      await dataView.create('security-solution');
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await dataView.delete('security-solution');
    });

    describe('health', () => {
      it('should be healthy', async () => {
        log.info(`Checking health of privilege monitoring`);
        const res = await api.privMonHealth();

        if (res.status !== 200) {
          log.error(`Health check failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
      });
    });

    describe('init', () => {
      it('should be able to be called multiple times', async () => {
        log.info(`Initializing Privilege Monitoring engine`);
        const res1 = await api.initMonitoringEngine();

        if (res1.status !== 200) {
          log.error(`Failed to initialize engine`);
          log.error(JSON.stringify(res1.body));
        }

        expect(res1.status).eql(200);

        log.info(`Re-initializing Privilege Monitoring engine`);
        const res2 = await api.initMonitoringEngine();
        if (res2.status !== 200) {
          log.error(`Failed to re-initialize engine`);
          log.error(JSON.stringify(res2.body));
        }

        expect(res2.status).eql(200);
      });
    });

    describe('plain index sync', () => {
      log.info(`Syncing plain index`);
      const indexName = 'tatooine-privileged-users';
      const entitySource = {
        type: 'index',
        name: 'StarWars',
        managed: true,
        indexPattern: indexName,
        enabled: true,
        matchers: [
          {
            fields: ['user.role'],
            values: ['admin'],
          },
        ],
        filter: {},
      };
      afterEach(async () => {
        log.info(`Cleaning up after test`);
        try {
          await es.indices.delete({ index: indexName }, { ignore: [404] });
          await api.deleteMonitoringEngine({ query: { data: true } });
        } catch (err) {
          log.warning(`Failed to clean up in afterEach: ${err.message}`);
        }
      });
      beforeEach(async () => {
        // create the tatooine index
        await es.indices.create({
          index: indexName,
          mappings: {
            properties: {
              user: {
                properties: {
                  name: {
                    type: 'keyword',
                    fields: {
                      text: { type: 'text' },
                    },
                  },
                  role: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
        });
      });

      it('should sync plain index', async () => {
        // Bulk insert documents
        const uniqueUsers = [
          'Luke Skywalker',
          'Leia Organa',
          'Han Solo',
          'Chewbacca',
          'Obi-Wan Kenobi',
          'Yoda',
          'R2-D2',
          'C-3PO',
          'Darth Vader',
        ].flatMap((name) => [{ index: {} }, { user: { name, role: 'admin' } }]);
        const repeatedUsers = Array.from({ length: 150 }).flatMap(() => [
          { index: {} },
          { user: { name: 'C-3PO', role: 'admin' } },
        ]);

        const bulkBody = [...uniqueUsers, ...repeatedUsers];
        await es.bulk({ index: indexName, body: bulkBody, refresh: true });
        // register entity source
        const response = await api.createEntitySource({ body: entitySource }, 'default');
        expect(response.status).to.be(200);
        expect(response.status).to.be(200);
        // Call init to trigger the sync
        await privMonUtils.initPrivMonEngine();
        // default-monitoring-index should exist now
        const result = await kibanaServer.savedObjects.find({
          type: 'entity-analytics-monitoring-entity-source',
          space: 'default',
        });

        const names = result.saved_objects.map((so) => so.attributes.name);
        expect(names).to.contain('default-monitoring-index-default');
        expect(names).to.contain('StarWars');
        await waitForPrivMonUsersToBeSynced();
        // Check if the users are indexed
        const res = await api.listPrivMonUsers({ query: {} });
        const userNames = res.body.map((u: any) => u.user.name);
        expect(userNames).to.contain('Luke Skywalker');
        expect(userNames).to.contain('C-3PO');
        expect(userNames.filter((name: string) => name === 'C-3PO')).to.have.length(1);
      });
    });
  });
};
