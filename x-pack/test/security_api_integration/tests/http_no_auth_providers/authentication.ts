/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  describe('authorization', () => {
    it('fail request without authorization request header', async () => {
      await supertest.get('/internal/security/me').set('kbn-xsrf', 'true').expect(401);
    });

    it('accept request with authorization request header', async () => {
      const credentials = Buffer.from(
        `${adminTestUser.username}:${adminTestUser.password}`
      ).toString('base64');

      const { body: user, headers } = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Basic ${credentials}`)
        .expect(200);

      expect(user.username).to.eql(adminTestUser.username);
      expect(user.authentication_provider).to.eql({ type: 'http', name: '__http__' });
      expect(user.authentication_type).to.eql('realm');

      // Make sure we don't automatically create a session
      expect(headers['set-cookie']).to.be(undefined);
    });
  });
}
