/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { disablePrivmonSetting, enablePrivmonSetting } from '../../utils';
import { PrivMonUtils } from './privileged_users/utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const kibanaServer = getService('kibanaServer');
  const privMonUtils = PrivMonUtils(getService);
  const log = getService('log');
  const es = getService('es');
  const retry = getService('retry');

  const createUserIndex = async (indexName: string) =>
    es.indices.create({
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

  const waitForPrivMonUsersToBeSynced = async (length = 1) =>
    retry.waitForWithTimeout('Wait for PrivMon users to be synced', 90000, async () => {
      const res = await api.listPrivMonUsers({ query: {} });
      log.info(`PrivMon users sync check: found ${res.body.length} users`);
      return res.body.length >= length; // wait until we have at least one user
    });

  describe('@ess Entity Privilege Monitoring APIs', () => {
    before(async () => {
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await disablePrivmonSetting(kibanaServer);
    });

    afterEach(async () => {
      await api.deleteMonitoringEngine({ query: { data: true } });
    });

    describe('health', () => {
      it('should be healthy', async () => {
        const res = await api.privMonHealth();

        if (res.status !== 200) {
          log.error(`Health check failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).toEqual(200);
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

        expect(res1.status).toEqual(200);

        log.info(`Re-initializing Privilege Monitoring engine`);
        const res2 = await api.initMonitoringEngine();
        if (res2.status !== 200) {
          log.error(`Failed to re-initialize engine`);
          log.error(JSON.stringify(res2.body));
        }

        expect(res2.status).toEqual(200);
      });
    });

    describe('plain index sync', () => {
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

      beforeEach(async () => {
        await createUserIndex(indexName);
      });

      afterEach(async () => {
        try {
          await es.indices.delete({ index: indexName }, { ignore: [404] });
        } catch (err) {
          log.warning(`Failed to clean up in afterEach: ${err.message}`);
        }
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

        // Call init to trigger the sync
        await privMonUtils.initPrivMonEngine();

        // register entity source
        const response = await api.createEntitySource({ body: entitySource });
        expect(response.status).toBe(200);

        // default-monitoring-index should exist now
        const sources = await api.listEntitySources({ query: {} });
        const names = sources.body.map((s: any) => s.name);
        expect(names).toContain('StarWars');
        await waitForPrivMonUsersToBeSynced(9);
        // Check if the users are indexed
        const res = await api.listPrivMonUsers({ query: {} });
        const userNames = res.body.map((u: any) => u.user.name);
        expect(userNames).toContain('Luke Skywalker');
        expect(userNames).toContain('C-3PO');
        expect(userNames.filter((name: string) => name === 'C-3PO')).toHaveLength(1);
      });
    });
  });
};
