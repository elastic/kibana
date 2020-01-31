/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import request from 'request';

export default function({ getService }) {
  const supertest = getService('supertestWithoutAuth');

  function extractSessionCookie(response) {
    const cookie = (response.headers['set-cookie'] || []).find(header => header.startsWith('sid='));
    return cookie ? request.cookie(cookie) : undefined;
  }

  describe('login', () => {
    it('accepts valid login credentials as 204 status', async () => {
      await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'true')
        .send({ username: 'elastic', password: 'changeme' })
        .expect(204);
    });

    it('sets HttpOnly cookie with valid login', async () => {
      const response = await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'true')
        .send({ username: 'elastic', password: 'changeme' })
        .expect(204);

      const cookie = extractSessionCookie(response);
      if (!cookie) {
        throw new Error('No session cookie set');
      }

      if (!cookie.httpOnly) {
        throw new Error('Session cookie is not marked as HttpOnly');
      }
    });

    it('rejects without kbn-xsrf header as 400 status even if credentials are valid', async () => {
      const response = await supertest
        .post('/api/security/v1/login')
        .send({ username: 'elastic', password: 'changeme' })
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects without credentials as 400 status', async () => {
      const response = await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'true')
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects without password as 400 status', async () => {
      const response = await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'true')
        .send({ username: 'elastic' })
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects without username as 400 status', async () => {
      const response = await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'true')
        .send({ password: 'changme' })
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects invalid credentials as 401 status', async () => {
      const response = await supertest
        .post('/api/security/v1/login')
        .set('kbn-xsrf', 'true')
        .send({ username: 'elastic', password: 'notvalidpassword' })
        .expect(401);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });
  });
}
