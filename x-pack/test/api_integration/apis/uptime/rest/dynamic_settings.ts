/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isRight } from 'fp-ts/lib/Either';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  DynamicSettingsType,
  DynamicSettings,
} from '../../../../../plugins/uptime/common/runtime_types';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../plugins/uptime/common/constants';
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('dynamic settings', () => {
    it('returns the defaults when no user settings have been saved', async () => {
      const apiResponse = await supertest.get(`/api/uptime/dynamic_settings`);
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
        .post(`/api/uptime/dynamic_settings`)
        .set('kbn-xsrf', 'true')
        .send(newSettings);

      expect(postResponse.body).to.eql({ success: true });
      expect(postResponse.status).to.eql(200);

      const getResponse = await supertest.get(`/api/uptime/dynamic_settings`);
      expect(getResponse.body).to.eql(newSettings);
      expect(isRight(DynamicSettingsType.decode(getResponse.body))).to.be.ok();
    });
  });
}
