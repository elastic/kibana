/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import request from 'request';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  const kibanaServerConfig = config.get('servers.kibana');
  const validUsername = kibanaServerConfig.username;
  const validPassword = kibanaServerConfig.password;

  describe('Basic authentication', () => {
    it('should redirect non-AJAX requests to the login page if not authenticated', async () => {
      const response = await supertest.get('/abc/xyz')
        .expect(302);

      expect(response.headers.location).to.be('/login?next=%2Fabc%2Fxyz');
    });

    it('should reject API requests if client is not authenticated', async () => {
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .expect(401);
    });

    it('should reject login with wrong credentials', async () => {
      const wrongUsername = `wrong-${validUsername}`;
      const wrongPassword = `wrong-${validPassword}`;

      await supertest.post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: wrongUsername, password: wrongPassword })
        .expect(401);

      await supertest.post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: validUsername, password: wrongPassword })
        .expect(401);

      await supertest.post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: wrongUsername, password: validPassword })
        .expect(401);
    });

    it('should set authentication cookie for login with valid credentials', async () => {
      const loginResponse = await supertest.post('/api/security/v1/login')
        .set('kbn-xsrf', 'xxx')
        .send({ username: validUsername, password: validPassword })
        .expect(204);

      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).to.have.length(1);

      const sessionCookie = request.cookie(cookies[0]);
      expect(sessionCookie.key).to.be('sid');
      expect(sessionCookie.value).to.not.be.empty();
      expect(sessionCookie.path).to.be('/');
      expect(sessionCookie.httpOnly).to.be(true);
    });

    it('should reject access to the API with wrong credentials in the header', async () => {
      const wrongUsername = `wrong-${validUsername}`;
      const wrongPassword = `wrong-${validPassword}`;

      await supertest.get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Basic ${new Buffer(`${wrongUsername}:${wrongPassword}`).toString('base64')}`)
        .expect(401);

      await supertest.get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Basic ${new Buffer(`${validUsername}:${wrongPassword}`).toString('base64')}`)
        .expect(401);

      await supertest.get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Basic ${new Buffer(`${wrongUsername}:${validPassword}`).toString('base64')}`)
        .expect(401);
    });

    it('should allow access to the API with valid credentials in the header', async () => {
      const apiResponse = await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Basic ${new Buffer(`${validUsername}:${validPassword}`).toString('base64')}`)
        .expect(200);

      expect(apiResponse.body).to.only.have.keys([
        'username',
        'full_name',
        'email',
        'roles',
        'scope',
        'metadata',
        'enabled',
        'authentication_realm',
        'lookup_realm',
      ]);
      expect(apiResponse.body.username).to.be(validUsername);
    });

    describe('with session cookie', () => {
      let sessionCookie;
      beforeEach(async () => {
        const loginResponse = await supertest.post('/api/security/v1/login')
          .set('kbn-xsrf', 'xxx')
          .send({ username: validUsername, password: validPassword })
          .expect(204);

        sessionCookie = request.cookie(loginResponse.headers['set-cookie'][0]);
      });

      it('should allow access to the API', async () => {
        // There is no session cookie provided and no server side session should have
        // been established, so request should be rejected.
        await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .expect(401);

        const apiResponse = await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponse.body).to.only.have.keys([
          'username',
          'full_name',
          'email',
          'roles',
          'scope',
          'metadata',
          'enabled',
          'authentication_realm',
          'lookup_realm',
        ]);
        expect(apiResponse.body.username).to.be(validUsername);
      });

      it('should extend cookie on every successful non-system API call', async () => {
        const apiResponseOne = await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseOne.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieOne = request.cookie(apiResponseOne.headers['set-cookie'][0]);

        expect(sessionCookieOne.value).to.not.be.empty();
        expect(sessionCookieOne.value).to.not.equal(sessionCookie.value);

        const apiResponseTwo = await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseTwo.headers['set-cookie']).to.not.be(undefined);
        const sessionCookieTwo = request.cookie(apiResponseTwo.headers['set-cookie'][0]);

        expect(sessionCookieTwo.value).to.not.be.empty();
        expect(sessionCookieTwo.value).to.not.equal(sessionCookieOne.value);
      });

      it('should not extend cookie for system API calls', async () => {
        const systemAPIResponse = await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .set('kbn-system-api', 'true')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(systemAPIResponse.headers['set-cookie']).to.be(undefined);
      });

      it('should fail and preserve session cookie if unsupported authentication schema is used', async () => {
        const apiResponse = await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .set('Authorization', 'Bearer AbCdEf')
          .set('Cookie', sessionCookie.cookieString())
          .expect(400);

        expect(apiResponse.headers['set-cookie']).to.be(undefined);
      });

      it('should clear cookie on logout and redirect to login', async ()=> {
        const logoutResponse = await supertest.get('/api/security/v1/logout?next=%2Fabc%2Fxyz&msg=test')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        const cookies = logoutResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const logoutCookie = request.cookie(cookies[0]);
        expect(logoutCookie.key).to.be('sid');
        expect(logoutCookie.value).to.be.empty();
        expect(logoutCookie.path).to.be('/');
        expect(logoutCookie.httpOnly).to.be(true);
        expect(logoutCookie.maxAge).to.be(0);

        expect(logoutResponse.headers.location).to.be('/login?next=%2Fabc%2Fxyz&msg=test');
      });

      it('should not render login page and redirect to `next` URL', async () => {
        const loginViewResponse = await supertest
          .get('/login?next=%2Fapp%2Fml%3Fone%3Dtwo')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        expect(loginViewResponse.headers.location).to.be('/app/ml?one=two');
      });

      it('should not render login page and redirect to the base path if `next` is absolute URL', async () => {
        const loginViewResponse = await supertest
          .get('/login?next=http%3A%2F%2Fhack.you%2F%3Fone%3Dtwo')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        expect(loginViewResponse.headers.location).to.be('/');
      });

      it('should not render login page and redirect to the base path if `next` is network-path reference',
        async () => {
          // Try `//hack.you` that NodeJS URL parser with `slashesDenoteHost` option
          let loginViewResponse = await supertest
            .get('/login?next=%2F%2Fhack.you%2F%3Fone%3Dtwo')
            .set('Cookie', sessionCookie.cookieString())
            .expect(302);

          expect(loginViewResponse.headers.location).to.be('/');

          // Try link with 3 slashes, that is still valid redirect target for browsers (for bwc reasons),
          // but is parsed in a different by NodeJS URL parser.
          loginViewResponse = await supertest
            .get('/login?next=%2F%2F%2Fhack.you%2F%3Fone%3Dtwo')
            .set('Cookie', sessionCookie.cookieString())
            .expect(302);

          expect(loginViewResponse.headers.location).to.be('/');
        });

      it('should redirect to home page if cookie is not provided', async ()=> {
        const logoutResponse = await supertest.get('/api/security/v1/logout')
          .expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/');
      });
    });
  });
}
