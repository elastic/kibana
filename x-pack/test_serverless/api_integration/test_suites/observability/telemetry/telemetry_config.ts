/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import type { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function telemetryConfigTest({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertest = getService('supertest');

  describe('/api/telemetry/v2/config API Telemetry config', function () {
    const baseConfig = {
      allowChangingOptInStatus: false,
      optIn: true,
      sendUsageFrom: 'server',
      telemetryNotifyUserAboutOptInDefault: false,
      labels: {
        serverless: 'observability',
      },
    };
    let roleCredentials: RoleCredentials;

    before(async () => {
      roleCredentials = await svlUserManager.createApiKeyForRole('admin');
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleCredentials);
    });

    it('GET should get the default config', async () => {
      const { body } = await supertest
        .get('/api/telemetry/v2/config')
        .set(svlCommonApi.getCommonRequestHeader())
        .set(roleCredentials.apiKeyHeader)
        .expect(200);
      expect(body).toMatchObject(baseConfig);
    });

    it('GET should get updated labels after dynamically updating them', async () => {
      await supertest
        .put('/internal/core/_settings')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleCredentials.apiKeyHeader)
        .set('elastic-api-version', '1')
        .send({ 'telemetry.labels.journeyName': 'my-ftr-test' })
        .expect(200, { ok: true });

      const response = await supertest
        .get('/api/telemetry/v2/config')
        .set(svlCommonApi.getCommonRequestHeader())
        .set(roleCredentials.apiKeyHeader);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...baseConfig,
        labels: expect.objectContaining({
          ...baseConfig.labels,
          journeyName: 'my-ftr-test',
        }),
      });
    });
  });
}
