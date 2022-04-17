/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { isRight } from 'fp-ts/lib/Either';
import { DynamicSettingsType, DynamicSettings } from '@kbn/uptime-plugin/common/runtime_types';
import { DYNAMIC_SETTINGS_DEFAULTS, API_URLS } from '@kbn/uptime-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('dynamic settings', () => {
    it('returns the defaults when no user settings have been saved', async () => {
      const apiResponse = await supertest.get(API_URLS.DYNAMIC_SETTINGS);
      expect(apiResponse.body).to.eql(DYNAMIC_SETTINGS_DEFAULTS);
      expect(isRight(DynamicSettingsType.decode(apiResponse.body))).to.be.ok();
    });

    it('can change the settings', async () => {
      const newSettings: DynamicSettings = {
        heartbeatIndices: 'myIndex1*',
        certAgeThreshold: 15,
        certExpirationThreshold: 5,
        defaultConnectors: [],
      };
      const postResponse = await supertest
        .post(API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send(newSettings);

      expect(postResponse.body).to.eql({ success: true });
      expect(postResponse.status).to.eql(200);

      const getResponse = await supertest.get(API_URLS.DYNAMIC_SETTINGS);
      expect(getResponse.body).to.eql(newSettings);
      expect(isRight(DynamicSettingsType.decode(getResponse.body))).to.be.ok();
    });
  });
}
