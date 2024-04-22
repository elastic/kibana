/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function telemetryConfigTest({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  // failsOnMKI, see https://github.com/elastic/kibana/issues/180348
  describe('/api/telemetry/v2/config API Telemetry config', function () {
    this.tags(['failsOnMKI']);

    const baseConfig = {
      allowChangingOptInStatus: false,
      optIn: true,
      sendUsageFrom: 'server',
      telemetryNotifyUserAboutOptInDefault: false,
      labels: {
        serverless: 'security',
      },
    };

    it('GET should get the default config', async () => {
      const { body } = await supertest
        .get('/api/telemetry/v2/config')
        .set(svlCommonApi.getCommonRequestHeader())
        .expect(200);
      expect(body).toMatchObject(baseConfig);
    });

    it('GET should get updated labels after dynamically updating them', async () => {
      await supertest
        .put('/internal/core/_settings')
        .set(svlCommonApi.getInternalRequestHeader())
        .set('elastic-api-version', '1')
        .send({ 'telemetry.labels.journeyName': 'my-ftr-test' })
        .expect(200, { ok: true });

      await supertest
        .get('/api/telemetry/v2/config')
        .set(svlCommonApi.getCommonRequestHeader())
        .expect(200, {
          ...baseConfig,
          labels: {
            ...baseConfig.labels,
            journeyName: 'my-ftr-test',
          },
        });
    });
  });
}
