/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ApmApiSupertest } from '../../common/apm_api_supertest';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  async function callApi(apiClient: ApmApiSupertest) {
    return await apiClient({
      endpoint: 'GET /internal/apm/storage_explorer/privileges',
    });
  }

  registry.when('Storage Explorer privileges', { config: 'basic', archives: [] }, () => {
    it('returns true when the user has the required indices privileges', async () => {
      const { status, body } = await callApi(apmApiClient.monitorClusterAndIndicesUser);
      expect(status).to.be(200);
      expect(body.hasPrivileges).to.be(true);
    });

    it(`returns false when the user doesn't have the required indices privileges`, async () => {
      const { status, body } = await callApi(apmApiClient.writeUser);
      expect(status).to.be(200);
      expect(body.hasPrivileges).to.be(false);
    });
  });
}
