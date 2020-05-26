/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { defaultDynamicSettings } from '../../../../../legacy/plugins/uptime/common/runtime_types/dynamic_settings';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('dynamic settings', () => {
    it('returns the defaults when no user settings have been saved', async () => {
      const apiResponse = await supertest.get(`/api/uptime/dynamic_settings`);
      expect(apiResponse.body).to.eql(defaultDynamicSettings as any);
    });

    it('can change the settings', async () => {
      const newSettings = { heartbeatIndices: 'myIndex1*' };
      const postResponse = await supertest
        .post(`/api/uptime/dynamic_settings`)
        .set('kbn-xsrf', 'true')
        .send(newSettings);

      expect(postResponse.body).to.eql({ success: true });
      expect(postResponse.status).to.eql(200);

      const getResponse = await supertest.get(`/api/uptime/dynamic_settings`);
      expect(getResponse.body).to.eql(newSettings);
    });
  });
}
