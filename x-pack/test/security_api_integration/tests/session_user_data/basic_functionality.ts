/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import request from 'request';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const notSuperuserTestUser = { username: 'test_user', password: 'changeme' };

  async function login(credentials: { username: string; password: string }) {
    const authenticationResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: credentials,
      })
      .expect(200);
    return request.cookie(authenticationResponse.headers['set-cookie'][0])!;
  }

  describe('Session User Data', () => {
    beforeEach(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', wait_for_status: 'green' });
      await esDeleteAllIndices('.kibana_security_session*');
    });

    it('should be able to store and retrieve user data from session', async function () {
      const basicSessionCookie = await login(notSuperuserTestUser);

      // There is no session user data yet.
      await supertest
        .get('/api/session_user_data/some-key-1')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, {});
      await supertest
        .get('/api/session_user_data/some-key-2')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, {});

      // Save some session user data for key-1.
      await supertest
        .post('/api/session_user_data/some-key-1')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .send({ someData: 'some-data-key-1', someOtherData: 'some-other-data-key-1' })
        .expect(200);

      // Now we should have some session user data, but only for key-1.
      await supertest
        .get('/api/session_user_data/some-key-1')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, { someData: 'some-data-key-1', someOtherData: 'some-other-data-key-1' });
      await supertest
        .get('/api/session_user_data/some-key-2')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, {});

      // Save some session user data for key-2.
      await supertest
        .post('/api/session_user_data/some-key-2')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .send({ someData: 'some-data-key-2', someOtherData: 'some-other-data-key-2' })
        .expect(200);

      // Now we should have some session user data for both keys.
      await supertest
        .get('/api/session_user_data/some-key-1')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, { someData: 'some-data-key-1', someOtherData: 'some-other-data-key-1' });
      await supertest
        .get('/api/session_user_data/some-key-2')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, { someData: 'some-data-key-2', someOtherData: 'some-other-data-key-2' });

      // Remove data for key-1.
      await supertest
        .delete('/api/session_user_data/some-key-1')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200);

      // Now we should have some session user data only for key-2
      await supertest
        .get('/api/session_user_data/some-key-1')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, {});
      await supertest
        .get('/api/session_user_data/some-key-2')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, { someData: 'some-data-key-2', someOtherData: 'some-other-data-key-2' });

      // Remove data for key-2.
      await supertest
        .delete('/api/session_user_data/some-key-2')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200);

      // There should be no data for both keys anymore.
      await supertest
        .get('/api/session_user_data/some-key-1')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, {});
      await supertest
        .get('/api/session_user_data/some-key-2')
        .set('Cookie', basicSessionCookie.cookieString())
        .expect(200, {});
    });
  });
}
