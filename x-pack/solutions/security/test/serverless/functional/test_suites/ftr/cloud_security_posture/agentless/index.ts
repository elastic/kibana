/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as http from 'http';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObject, getService, loadTestFile }: FtrProviderContext) {
  const supertest = getService('supertest');
  const svlCommonPage = getPageObject('svlCommonPage');

  describe('cloud_security_posture', function () {
    this.tags(['cloud_security_posture_agentless']);

    let mockApiServer: http.Server;

    before(async () => {
      const { setupMockServer } = await import('./mock_agentless_api');
      const mockAgentlessApiService = setupMockServer();
      await new Promise<void>((resolve, reject) => {
        mockApiServer = mockAgentlessApiService.listen(8089, resolve);
        mockApiServer.once('error', reject);
      });

      await svlCommonPage.loginAsAdmin();
    });

    after(async () => {
      try {
        await supertest
          .delete('/api/fleet/epm/packages/cloud_security_posture')
          .set('kbn-xsrf', 'xxxx')
          .query({ force: true })
          .expect(200);
      } finally {
        await new Promise<void>((resolve) => mockApiServer.close(() => resolve()));
      }
    });

    loadTestFile(require.resolve('./cis_integration_aws'));
    loadTestFile(require.resolve('./cis_integration_gcp'));
    loadTestFile(require.resolve('./create_agent'));
  });
}
