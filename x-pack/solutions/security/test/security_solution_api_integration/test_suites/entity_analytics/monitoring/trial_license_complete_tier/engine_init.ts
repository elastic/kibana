/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { PrivMonUtils, createIndexEntitySource } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const privMonUtils = PrivMonUtils(getService);
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring Engine Init', () => {
    describe('init', () => {
      const indexName = 'privileged-users-index-pattern';
      const indexName2 = 'privileged-users-index-pattern-2';
      const entitySource = createIndexEntitySource(indexName, { name: 'PrivilegedUsers' });
      const entitySource2 = createIndexEntitySource(indexName2, { name: 'PrivilegedUsers2' });

      afterEach(async () => {
        await es.indices.delete({ index: indexName }, { ignore: [404] });
        await es.indices.delete({ index: indexName2 }, { ignore: [404] });
        await api.deleteMonitoringEngine({ query: { data: true } });
      });

      it('should not create duplicate monitoring data sources', async () => {
        const response = await api.createEntitySource({ body: entitySource });
        const response2 = await api.createEntitySource({ body: entitySource2 });
        expect(response.status).toBe(200);
        expect(response2.status).toBe(200);
        const sources = await api.listEntitySources({ query: {} });
        const names = sources.body.sources.map((s: any) => s.name);
        // confirm sources have been created
        expect(names).toEqual(expect.arrayContaining(['PrivilegedUsers', 'PrivilegedUsers2']));
        // Try to create the same entity sources again
        await api.createEntitySource({ body: entitySource });
        await api.createEntitySource({ body: entitySource2 });
        const nonDuplicateSources = await api.listEntitySources({ query: {} });
        const nonDuplicateNames = nonDuplicateSources.body.sources.map((s: any) => s.name);
        // confirm duplicates have not been created
        expect(names.length).toBe(nonDuplicateNames.length);
      });

      it('should be able to be called multiple times', async () => {
        log.info(`Initializing Privilege Monitoring engine`);
        await privMonUtils.initPrivMonEngine();
        log.info(`Re-initializing Privilege Monitoring engine`);
        await privMonUtils.initPrivMonEngine();
      });
    });
  });
};
