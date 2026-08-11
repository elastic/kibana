/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type {
  ListPrivMonUsersResponse,
  CreateEntitySourceResponse,
} from '@kbn/security-solution-plugin/common/api/entity_analytics';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { PrivMonUtils } from '../utils';

export default ({ getService }: FtrProviderContext) => {
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const es = getService('es');
  const privMonUtils = PrivMonUtils(getService);

  const createSourceIndex = async (indexName: string) =>
    es.indices.create({
      index: indexName,
      mappings: {
        properties: {
          user: {
            properties: {
              name: {
                type: 'keyword',
              },
            },
          },
        },
      },
    });

  describe('@ess @serverless @skipInServerlessMKI Entity Monitoring Privileged Users APIs', () => {
    after(async () => {
      await entityAnalyticsApi.deleteMonitoringEngine({ query: { data: true } });
    });

    describe('Index Entity Source APIs', () => {
      const index1 = 'privmon_index1';
      const index2 = 'privmon_index2';
      const user1 = { name: 'user_1' };
      const user2 = { name: 'user_2' };

      beforeEach(async () => {
        await createSourceIndex(index1);
        await createSourceIndex(index2);

        await es.index({
          index: index1,
          body: { user: user1 },
          refresh: 'wait_for',
        });

        await es.index({
          index: index2,
          body: { user: user2 },
          refresh: 'wait_for',
        });
      });

      afterEach(async () => {
        await es.indices.delete({ index: index1 });
        await es.indices.delete({ index: index2 });
      });

      it('should delete privileged users when the index pattern changes', async () => {
        await privMonUtils.initPrivMonEngine();
        const createEntitySourceResponse = await entityAnalyticsApi.createEntitySource({
          body: {
            type: 'index',
            name: 'User Monitored Indices',
            indexPattern: index1,
          },
        });

        expect(createEntitySourceResponse.status).toBe(200);
        const { id: entitySourceId } =
          createEntitySourceResponse.body as CreateEntitySourceResponse;

        await privMonUtils.waitForSyncTaskRun();

        await entityAnalyticsApi.updateEntitySource({
          body: {
            indexPattern: index2,
          },
          params: { id: entitySourceId },
        });

        await privMonUtils.waitForSyncTaskRun();

        const usersForIndex2 = (await entityAnalyticsApi.listPrivMonUsers({ query: {} }))
          .body as ListPrivMonUsersResponse;

        privMonUtils.assertIsPrivileged(privMonUtils.findUser(usersForIndex2, user2.name), true);
        privMonUtils.assertIsPrivileged(privMonUtils.findUser(usersForIndex2, user1.name), false);

        await entityAnalyticsApi.updateEntitySource({
          body: {
            indexPattern: `${index2},${index1}`,
          },
          params: { id: entitySourceId },
        });

        await privMonUtils.waitForSyncTaskRun();

        const usersForIndex1AndIndex2 = (await entityAnalyticsApi.listPrivMonUsers({ query: {} }))
          .body as ListPrivMonUsersResponse;

        privMonUtils.assertIsPrivileged(
          privMonUtils.findUser(usersForIndex1AndIndex2, user1.name),
          true
        );
        privMonUtils.assertIsPrivileged(
          privMonUtils.findUser(usersForIndex1AndIndex2, user2.name),
          true
        );
      });
    });
  });
};
