/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { privilegeMonitoringTypeName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/privilege_monitoring/saved_objects/privilege_monitoring_type';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { privilegeMonitoringRouteHelpersFactory } from '../../utils/privilege_monitoring';
import { enablePrivmonSetting } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const privmon = privilegeMonitoringRouteHelpersFactory(supertest);
  const log = getService('log');
  const es = getService('es');
  const spaceName = 'default';

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    const kibanaServer = getService('kibanaServer');
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
      // Want to make sure that monitoring saved objects are created and have something in them,
      const indexName = 'tatooine-privileged-users';
      const entitySource = {
        type: 'index' as const,
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
      after(async () => {
        // Probable do not need cleanup before AND after. Debugging WIP
        await es.indices.delete({ index: indexName }, { ignore: [404] });
        await es.indices.delete({ index: 'default-monitoring-index' }, { ignore: [404] });
        await privmon.deleteIndexSource('default-monitoring-index', { ignore404: true });
        await privmon.deleteIndexSource(entitySource.name, { ignore404: true });
      });
      before(async () => {
        const soId = await kibanaServer.savedObjects.find<{
          type: typeof privilegeMonitoringTypeName;
          space: string;
        }>({
          type: privilegeMonitoringTypeName,
          space: spaceName,
        });
        if (soId.saved_objects.length !== 0) {
          await kibanaServer.savedObjects.delete({
            type: privilegeMonitoringTypeName,
            space: spaceName,
            id: soId.saved_objects[0].id,
          });
        }
        // Delete quickly any existing source with the same name
        // Ensure index does not exist before creating it
        await es.indices.delete({ index: indexName }, { ignore: [404] });
        await es.indices.delete({ index: 'default-monitoring-index' }, { ignore: [404] });
        await privmon.deleteIndexSource('default-monitoring-index', { ignore404: true });
        await privmon.deleteIndexSource(entitySource.name, { ignore404: true });
        // await privmon.deleteIndexSource(entitySource.name);
        // Create index with mapping
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
        ].flatMap((name) => [{ index: {} }, { user: { name } }]);
        await es.bulk({ index: indexName, body: bulkBody, refresh: true });
      });

      it('should sync plain index', async () => {
        // Register monitoring source
        const response = await privmon.registerIndexSource(entitySource);
        expect(response.status).to.be(200);
        // Call init to trigger the sync
        await privmon.initEngine();
        // default-monitoring-index should exist now
        const result = await kibanaServer.savedObjects.find({
          type: 'entity-analytics-monitoring-entity-source',
          space: 'default',
        });

        const names = result.saved_objects.map((so) => so.attributes.name);
        expect(names).to.contain('default-monitoring-index');
        // How to make interval shorter to test the data syncs?
        // Now list the users in monitoring
        // const res = await privmon.listUsers(); // this should be undefined to start with. Can we change the interval to 1s?
        // console.log('Users in monitoring:', res.body.users);
        // const userNames = res.body.users.map((u: any) => u.name);
        // expect(userNames).to.be.an('array');
        // expect(userNames.length).to.be.greaterThan(0);
        // expect(userNames).contain('Luke Skywalker');
        // expect(userNames).contain('Leia Organa');
      });
    });
  });
};
