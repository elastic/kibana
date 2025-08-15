/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/privilege_monitoring/users/list.gen';
import { CreateEntitySourceResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/privilege_monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import { WriteResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { getPrivilegedMonitorUsersIndex } from '@kbn/security-solution-plugin/common/entity_analytics/privilege_monitoring/utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
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
              label: {
                type: 'keyword',
              },
            },
          },
        },
      },
    });

  describe('@ess @skipInServerlessMKI Entity Monitoring Privileged Users APIs', () => {
    const kibanaServer = getService('kibanaServer');

    before(async () => {
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await disablePrivmonSetting(kibanaServer);
    });

    afterEach(async () => {
      await api.deleteMonitoringEngine({ query: { data: true } });
    });

    describe('Index Entity Source APIs', () => {
      const index1 = 'privmon_index1';
      const index2 = 'privmon_index2';
      const emptyIndex = 'empty_index';
      const user1 = { name: 'user_1', label: 'superuser label' };
      const user2 = { name: 'user_2', label: 'tester label' };
      let indexUser1Response: WriteResponseBase;

      beforeEach(async () => {
        await createSourceIndex(index1);
        await createSourceIndex(index2);
        await createSourceIndex(emptyIndex);

        indexUser1Response = await es.index({
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
        await es.indices.delete({ index: emptyIndex });
      });

      it('should delete privileged users when the index pattern changes', async () => {
        await privMonUtils.initPrivMonEngine();
        const createEntitySourceResponse = await api.createEntitySource({
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

        await api.updateEntitySource({
          body: {
            indexPattern: index2,
          },
          params: { id: entitySourceId },
        });

        await privMonUtils.waitForSyncTaskRun();

        const usersForIndex2 = (await api.listPrivMonUsers({ query: {} }))
          .body as ListPrivMonUsersResponse;

        privMonUtils.assertIsPrivileged(privMonUtils.findUser(usersForIndex2, user2.name), true);
        privMonUtils.assertIsPrivileged(privMonUtils.findUser(usersForIndex2, user1.name), false);

        await api.updateEntitySource({
          body: {
            indexPattern: `${index2},${index1}`,
          },
          params: { id: entitySourceId },
        });

        await privMonUtils.waitForSyncTaskRun();

        const usersForIndex1AndIndex2 = (await api.listPrivMonUsers({ query: {} }))
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

      it('should add label', async () => {
        await privMonUtils.initPrivMonEngine();
        await api.createEntitySource({
          body: {
            type: 'index',
            name: 'User Monitored Indices',
            indexPattern: index1,
          },
        });
        await privMonUtils.waitForSyncTaskRun();

        const users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
        const user = privMonUtils.findUser(users, user1.name);

        expect(user?.entity_analytics_monitoring?.labels).toEqual([
          expect.objectContaining({
            field: 'label',
            value: user1.label,
          }),
        ]);
      });

      it('should update label', async () => {
        const updatedLabel = user1.label + ' updated';
        await privMonUtils.initPrivMonEngine();
        const createEntitySourceResponse = await api.createEntitySource({
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

        // Update user label
        await es.update({
          index: index1,
          id: indexUser1Response._id,
          doc: {
            user: {
              label: updatedLabel,
            },
          },

          refresh: 'wait_for',
        });

        await api.updateEntitySource({
          body: {
            indexPattern: `${index1},${emptyIndex}`, // Add empty index to trigger sync without changing the content
          },
          params: { id: entitySourceId },
        });

        await privMonUtils.waitForSyncTaskRun();

        const updatedUsers = (await api.listPrivMonUsers({ query: {} }))
          .body as ListPrivMonUsersResponse;
        const updatedUser = privMonUtils.findUser(updatedUsers, user1.name);

        expect(updatedUser?.entity_analytics_monitoring?.labels).toEqual([
          expect.objectContaining({
            field: 'label',
            value: updatedLabel,
          }),
        ]);
      });

      it('should delete labels when user are soft deleted', async () => {
        await privMonUtils.initPrivMonEngine();
        const createEntitySourceResponse = await api.createEntitySource({
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

        await api.updateEntitySource({
          body: {
            indexPattern: emptyIndex,
          },
          params: { id: entitySourceId },
        });

        await privMonUtils.waitForSyncTaskRun();

        const users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
        const user = privMonUtils.findUser(users, user1.name);

        privMonUtils.assertIsPrivileged(user, false);
        expect(user?.entity_analytics_monitoring?.labels).toBeUndefined();
      });

      describe('when user has multiple datasources', () => {
        const index3 = 'privmon_index3';

        beforeEach(async () => {
          await createSourceIndex(index3);

          await es.index({
            index: index3,
            body: { user: user1 },
            refresh: 'wait_for',
          });
        });

        afterEach(async () => {
          await es.indices.delete({ index: index3 });
        });

        it('should delete label but keep label from another data source', async () => {
          await privMonUtils.initPrivMonEngine();
          const createEntitySourceResponse = await api.createEntitySource({
            body: {
              type: 'index',
              name: 'User Monitored Indices',
              indexPattern: `${index1},${index3}`,
            },
          });

          expect(createEntitySourceResponse.status).toBe(200);
          const { id: entitySourceId } =
            createEntitySourceResponse.body as CreateEntitySourceResponse;

          await privMonUtils.waitForSyncTaskRun();

          await api.updateEntitySource({
            body: {
              indexPattern: index1,
            },
            params: { id: entitySourceId },
          });

          await privMonUtils.waitForSyncTaskRun();

          const users = (await api.listPrivMonUsers({ query: {} }))
            .body as ListPrivMonUsersResponse;
          const user = privMonUtils.findUser(users, user1.name);
          privMonUtils.assertIsPrivileged(user, true);
          expect(user?.entity_analytics_monitoring?.labels).toEqual([
            expect.objectContaining({
              field: 'label',
              value: user1.label,
            }),
          ]);
        });
      });

      describe('when privileged user was created before the labels where implemented', () => {
        const oldIndex = 'old_index';

        beforeEach(async () => {
          await createSourceIndex(oldIndex);

          await es.index({
            index: oldIndex,
            body: { user: user1 },
            refresh: 'wait_for',
          });

          await privMonUtils.initPrivMonEngine();

          // simulate a user created before labels were implemented
          es.index({
            index: getPrivilegedMonitorUsersIndex('default'),
            body: {
              user: {
                name: user1.name,
                is_privileged: true,
              },
              labels: {
                sources: ['index'],
                source_ids: ['9999999'], // this source ID is not used in the test
              },
            },
            refresh: 'wait_for',
          });
        });

        afterEach(async () => {
          await es.indices.delete({ index: oldIndex });
        });

        it('should add label', async () => {
          const createEntitySourceResponse = await api.createEntitySource({
            body: {
              type: 'index',
              name: 'User Monitored Indices',
              indexPattern: `${index1},${oldIndex}`,
            },
          });
          expect(createEntitySourceResponse.status).toBe(200);

          await privMonUtils.waitForSyncTaskRun();

          const users = (await api.listPrivMonUsers({ query: {} }))
            .body as ListPrivMonUsersResponse;
          const user = privMonUtils.findUser(users, user1.name);

          privMonUtils.assertIsPrivileged(user, true);
          expect(user?.entity_analytics_monitoring?.labels).toEqual([
            expect.objectContaining({
              field: 'label',
              value: user1.label,
            }),
          ]);
        });
      });
    });
  });
};
