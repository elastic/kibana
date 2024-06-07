/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import type { RoleCredentials } from '../../../../shared/services';

export default function telemetryConfigTest({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');

  describe('/api/telemetry/v2/config API Telemetry config', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    const baseConfig = {
      allowChangingOptInStatus: false,
      optIn: true,
      sendUsageFrom: 'server',
      telemetryNotifyUserAboutOptInDefault: false,
    };

    it('GET should get the default config', async () => {
      const { body } = await supertestWithoutAuth
        .get('/api/telemetry/v2/config')
        .set(svlCommonApi.getCommonRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(200);

      expect(body).toMatchObject(baseConfig);
    });

    it('GET should get updated labels after dynamically updating them', async () => {
      const { body: initialConfig } = await supertestWithoutAuth
        .get('/api/telemetry/v2/config')
        .set(svlCommonApi.getCommonRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(200);

      await supertestWithoutAuth
        .put('/internal/core/_settings')
        .set(svlCommonApi.getInternalRequestHeader())
        .set('elastic-api-version', '1')
        .set(roleAuthc.apiKeyHeader)
        .send({ 'telemetry.labels.journeyName': 'my-ftr-test' })
        .expect(200, { ok: true });

      await supertestWithoutAuth
        .get('/api/telemetry/v2/config')
        .set(svlCommonApi.getCommonRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(200, {
          ...initialConfig,
          labels: {
            ...initialConfig.labels,
            journeyName: 'my-ftr-test',
          },
        });
    });
  });
}
