/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('security/me as viewer', () => {
    const svlUserManager = getService('svlUserManager');
    const svlCommonApi = getService('svlCommonApi');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    let credentials: { Cookie: string };

    before(async () => {
      // get auth header for Viewer role
      credentials = await svlUserManager.getApiCredentialsForRole('viewer');
    });

    it('returns valid user data for authenticated request', async () => {
      const { body, status } = await supertestWithoutAuth
        .get('/internal/security/me')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(credentials);

      const userData = await svlUserManager.getUserData('viewer');

      expect(status).to.be(200);
      expect(body.full_name).to.be(userData.fullname);
      expect(body.email).to.be(userData.email);
    });
  });
}
