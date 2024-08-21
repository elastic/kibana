/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import { adminTestUser } from '@kbn/test';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  function extractSessionCookie(response: { headers: Record<string, string[]> }) {
    const cookie = (response.headers['set-cookie'] || []).find((header) =>
      header.startsWith('sid=')
    );
    return cookie ? parseCookie(cookie) : undefined;
  }

  describe('CHIPS', () => {
    it('accepts valid session cookie', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: adminTestUser.username, password: adminTestUser.password },
        })
        .expect(200);

      const cookie = extractSessionCookie(response)!;

      expect(cookie.sameSite).to.eql('none');
      expect(cookie.secure).to.eql(true);
      expect(cookie.toString()).contain('Partitioned');

      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', cookie.cookieString())
        .expect(200);

      expect(user.username).to.eql(adminTestUser.username);
      expect(user.authentication_provider).to.eql({ type: 'basic', name: 'basic1' });
      expect(user.authentication_type).to.eql('realm');
    });
  });
}
