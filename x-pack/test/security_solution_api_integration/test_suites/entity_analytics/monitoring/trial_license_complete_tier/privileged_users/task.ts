/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/privilege_monitoring/users/list.gen';
import { CreateEntitySourceResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/privilege_monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../../utils/data_view';
import { PrivMonUtils } from './utils';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
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

  describe.only('@ess @serverless @skipInServerlessMKI Entity Monitoring Privileged Users APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    const kibanaServer = getService('kibanaServer');

    before(async () => {
      await dataView.create('security-solution');
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await dataView.delete('security-solution');
      await api.deleteMonitoringEngine({ query: { data: true } });
      await disablePrivmonSetting(kibanaServer);
    });

    describe('Index Entity Source APIs', () => {
      const defaultIndex = '.entity_analytics.monitoring.users-default';
      const index1 = 'privmon_index1';
      const index2 = 'privmon_index2';
      const defaultUser = { name: 'defaultUser' };
      const user1 = { name: 'user_1' };
      const user2 = { name: 'user_2' };

      beforeEach(async () => {
        await createSourceIndex(defaultIndex);
        await createSourceIndex(index1);
        await createSourceIndex(index2);

        await es.index({
          index: defaultIndex,
          body: { user: defaultUser },
          refresh: 'wait_for',
        });

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
        await es.indices.delete({ index: defaultIndex });
      });

      it('should catch the bug', async () => {
        await privMonUtils.initPrivMonEngine();
        // Add index1 as a data source using the UI
        const createEntitySourceResponse = await api.createEntitySource({
          body: {
            type: 'index',
            name: 'User Monitored Indices99999',
            indexPattern: index1,
          },
        });

        expect(createEntitySourceResponse.status).to.be(200);
        const { id: entitySourceId } =
          createEntitySourceResponse.body as CreateEntitySourceResponse;

        // const runAt = await launchTask(TASK_ID, kibanaServer, logger);

        await privMonUtils.waitForSyncTaskRun();

        // Update the UI to have index2 as a data source
        await api.updateEntitySource({
          body: {
            indexPattern: index2,
          },
          params: { id: entitySourceId },
        });

        await privMonUtils.waitForSyncTaskRun();

        // The list API should only return user2 as privileged
        const res = await api.listPrivMonUsers({
          query: {},
        });

        const listed = res.body as ListPrivMonUsersResponse;

        const user1Entry = listed.find((u) => u.user?.name === user1.name);
        const user2Entry = listed.find((u) => u.user?.name === user2.name);

        console.log(JSON.stringify(listed, null, 2));

        expect(user2Entry?.user?.is_privileged).to.be(true);
        expect(user1Entry?.user?.is_privileged).to.be(false);
      });
    });
  });
};
