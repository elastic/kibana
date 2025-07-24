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
  const spaceName = 'default';
  const es = getService('es');

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
        await es.indices.delete({ index: indexName }, { ignore: [404] });
        await api.deleteMonitoringEngine({ query: { data: true } });
      });
      before(async () => {
        await es.indices.delete({ index: indexName }, { ignore: [404] });
        await api.deleteMonitoringEngine({ query: { data: true } });
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
        // Bulk insert documents
        const bulkBody = [
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
        await es.bulk({ index: indexName, body: bulkBody, refresh: true });
      });

      it('should sync plain index', async () => {
        // register entity source
        const response = await api.createEntitySource({ body: entitySource }, 'default');
        expect(response.status).to.be(200);
        const boop = await es.search({
          index: 'tatooine-privileged-users',
          size: 1000,
          query: {
            match_all: {},
          },
        });
        const listedSources = await api.listEntitySources({ query: {} }, 'default');
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
        await sleep(40000); // Wait task to run
        const res = await api.listPrivMonUsers({
          query: {},
        });
        const userNames = res.body.map((monitoring: any) => monitoring.user.name);
        expect(userNames.length).to.be.greaterThan(0);
        expect(userNames).contain('Luke Skywalker');
        expect(userNames).contain('Leia Organa');
      });
      // add a test to handle duplicate users
    });
  });
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
