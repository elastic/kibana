/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function telemetryConfigTest({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

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
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    it('GET should get the default config', async () => {
      const { body } = await supertestWithoutAuth
        .get('/api/telemetry/v2/config')
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .expect(200);
      expect(body).toMatchObject(baseConfig);
    });

    it.skip('GET should get updated labels after dynamically updating them', async () => {
      await supertestWithoutAuth
        .put('/internal/core/_settings')
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .set('elastic-api-version', '1')
        .send({ 'telemetry.labels.journeyName': 'my-ftr-test' })
        .expect(200, { ok: true });

      const response = await supertestWithoutAuth
        .get('/api/telemetry/v2/config')
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);

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
