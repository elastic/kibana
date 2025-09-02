/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const es = getService('es');
  const privMonUtils = PrivMonUtils(getService);

  describe('@ess @skipInServerlessMKI Entity Monitoring Privileged Users APIs', () => {
    const kibanaServer = getService('kibanaServer');
    const index1 = 'privmon_index1';
    const user1 = { name: 'user_1' };

    before(async () => {
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await api.deleteMonitoringEngine({ query: { data: true } });
      await disablePrivmonSetting(kibanaServer);
    });

    beforeEach(async () => {
      await privMonUtils.createSourceIndex(index1);

      await es.index({
        index: index1,
        body: { user: user1 },
        refresh: 'wait_for',
      });
    });

    afterEach(async () => {
      await es.indices.delete({ index: index1 });
    });

    it('should update a user when it was already added by the API', async () => {
      await privMonUtils.initPrivMonEngine();

      await api.createPrivMonUser({
        body: { user: user1 },
      });

      const createEntitySourceResponse = await api.createEntitySource({
        body: {
          type: 'index',
          name: 'User Monitored Indices',
          indexPattern: index1,
        },
      });

      expect(createEntitySourceResponse.status).toBe(200);

      await privMonUtils.scheduleMonitoringEngineNow({ ignoreConflict: true });
      await privMonUtils.waitForSyncTaskRun();

      const users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      const user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toEqual(['api', 'index']);
    });
  });
};
