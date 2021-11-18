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
  const es = getService('es');

  async function createToken() {
    const { access_token: accessToken, authentication } = await es.security.getToken({
      body: {
        grant_type: 'password',
        ...adminTestUser,
      },
    });

    return {
      accessToken,
      expectedUser: {
        ...authentication,
        authentication_provider: { name: '__http__', type: 'http' },
        authentication_type: 'realm',
      },
    };
  }

  describe('authorization', () => {
    it('fail request without authorization request header', async () => {
      await supertest.get('/internal/security/me').set('kbn-xsrf', 'true').expect(401);
    });

    it('accept request with authorization request header', async () => {
      const { expectedUser } = await createToken();
      const accessToken = Buffer.from(
        `${adminTestUser.username}:${adminTestUser.password}`
      ).toString('base64');

      const response = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'true')
        .set('Authorization', `Basic ${accessToken}`)
        .expect(200, expectedUser);

      // Make sure we don't automatically create a session
      expect(response.headers['set-cookie']).to.be(undefined);
    });
  });
}
