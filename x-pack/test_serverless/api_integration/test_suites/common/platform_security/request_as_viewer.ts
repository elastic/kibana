/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('security/request as viewer', () => {
    const svlUserManager = getService('svlUserManager');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    let credentials: { Cookie: string };

    before(async () => {
      // get auth header for Viewer role
      credentials = await svlUserManager.getApiCredentialsForRole('viewer');
    });

    it('returns full status payload for authenticated request', async () => {
      const { body } = await supertestWithoutAuth
        .get('/api/status')
        .set(credentials)
        .set('kbn-xsrf', 'kibana');

      expect(body.name).to.be.a('string');
      expect(body.uuid).to.be.a('string');
      expect(body.version.number).to.be.a('string');
    });
  });
}
