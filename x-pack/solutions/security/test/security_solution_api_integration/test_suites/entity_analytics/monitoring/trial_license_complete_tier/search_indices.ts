/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { PRIVILEGED_MONITOR_IMPORT_USERS_INDEX_MAPPING } from '@kbn/security-solution-plugin/server/lib/entity_analytics/privilege_monitoring/engine/elasticsearch/mappings';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const es = getService('es');
  const log = getService('log');

  const logWhenNot200 = (res: any) => {
    if (res.status !== 200) {
      log.error(`Search index failed`);
      log.error(JSON.stringify(res.body));
    }
  };

  const indexName = 'user-index-test';

  describe('@ess @serverless @skipInServerlessMKI EntityAnalytics Monitoring SearchIndices', () => {
    before(async () => {
      await es.indices.create({
        index: indexName,
        mappings: { properties: PRIVILEGED_MONITOR_IMPORT_USERS_INDEX_MAPPING },
      });
    });

    after(async () => {
      await es.indices.delete({ index: indexName, ignore_unavailable: true });
    });

    describe('search_indices API', () => {
      it('should return an empty array if no indices match the search query', async () => {
        const res = await entityAnalyticsApi.searchPrivilegesIndices({
          query: { searchQuery: 'test_1235678' },
        });

        logWhenNot200(res);

        expect(res.status).eql(200);
        expect(res.body).eql([]);
      });

      it('should return all indices when no searchQuery is given', async () => {
        const res = await entityAnalyticsApi.searchPrivilegesIndices({
          query: { searchQuery: undefined },
        });

        logWhenNot200(res);

        expect(res.status).eql(200);
        expect(res.body).to.contain(indexName);
      });

      it('should return index when searchQuery matches', async () => {
        const res = await entityAnalyticsApi.searchPrivilegesIndices({
          query: { searchQuery: indexName },
        });

        logWhenNot200(res);

        expect(res.status).eql(200);
        expect(res.body.length).eql(1);
        expect(res.body).to.contain(indexName);
      });
    });
  });
};
