/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, generate } from '@kbn/data-forge';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { DATA_FORGE_CONFIG } from './helpers/dataforge';
import { DEFAULT_SLO } from './fixtures/slo';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const retry = getService('retry');
  const logger = getService('log');
  const samlAuth = getService('samlAuth');
  const dataViewApi = getService('dataViewApi');

  const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
  const DATA_VIEW_ID = 'data-view-id';

  let adminRoleAuthc: RoleCredentials;

  describe('Bulk Delete SLO', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      await generate({ client: esClient, config: DATA_FORGE_CONFIG, logger });

      await dataViewApi.create({
        roleAuthc: adminRoleAuthc,
        name: DATA_VIEW,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
      });

      await sloApi.deleteAllSLOs(adminRoleAuthc);
    });

    after(async () => {
      await dataViewApi.delete({ roleAuthc: adminRoleAuthc, id: DATA_VIEW_ID });
      await cleanup({ client: esClient, config: DATA_FORGE_CONFIG, logger });
      await sloApi.deleteAllSLOs(adminRoleAuthc);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('successfully processes the list of SLOs', async () => {
      const { id: sloId } = await sloApi.create(DEFAULT_SLO, adminRoleAuthc);

      const response = await sloApi.bulkDelete({ list: [sloId, 'inexistant-slo'] }, adminRoleAuthc);
      expect(response).to.have.property('taskId');

      await retry.waitFor('task completion', async () => {
        const status = await sloApi.bulkDeleteStatus(response.taskId, adminRoleAuthc);
        return status.isDone === true;
      });

      const status = await sloApi.bulkDeleteStatus(response.taskId, adminRoleAuthc);
      expect(status).eql({
        isDone: true,
        results: [
          {
            id: sloId,
            success: true,
          },
          {
            id: 'inexistant-slo',
            success: false,
            error: `SLO [inexistant-slo] not found`,
          },
        ],
      });
    });

    it('returns task not found', async () => {
      const status = await sloApi.bulkDeleteStatus('inexistant', adminRoleAuthc);
      expect(status).eql({ isDone: true, error: 'Task not found' });
    });
  });
}
