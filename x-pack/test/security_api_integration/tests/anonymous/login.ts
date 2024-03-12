/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie, Cookie } from 'tough-cookie';
import { adminTestUser } from '@kbn/test';
import { resolve } from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';
import { FileWrapper } from '../audit/file_wrapper';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');
  const security = getService('security');
  const retry = getService('retry');

  function checkCookieIsSet(cookie: Cookie) {
    expect(cookie.value).to.not.be.empty();

    expect(cookie.key).to.be('sid');
    expect(cookie.path).to.be('/');
    expect(cookie.httpOnly).to.be(true);
    expect(cookie.maxAge).to.be(null);
  }

  function checkCookieIsCleared(cookie: Cookie) {
    expect(cookie.value).to.be.empty();

    expect(cookie.key).to.be('sid');
    expect(cookie.path).to.be('/');
    expect(cookie.httpOnly).to.be(true);
    expect(cookie.maxAge).to.be(0);
  }

  const isElasticsearchAnonymousAccessEnabled = (
    config.get('esTestCluster.serverArgs') as string[]
  ).some((setting) => setting.startsWith('xpack.security.authc.anonymous'));

  describe('Anonymous authentication', () => {
    if (!isElasticsearchAnonymousAccessEnabled) {
      before(async () => {
        await security.user.create('anonymous_user', {
          password: 'changeme',
          roles: [],
          full_name: 'Guest',
        });
      });

      after(async () => {
        await security.user.delete('anonymous_user');
      });
    }

    it('should reject API requests if client is not authenticated', async () => {
      await supertest.get('/internal/security/me').set('kbn-xsrf', 'xxx').expect(401);
    });

    it('does not prevent basic login', async () => {
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

      const cookies = response.headers['set-cookie'];
      expect(cookies).to.have.length(1);

      const cookie = parseCookie(cookies[0])!;
      checkCookieIsSet(cookie);

      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', cookie.cookieString())
        .expect(200);

      expect(user.username).to.eql(adminTestUser.username);
      expect(user.authentication_provider).to.eql({ type: 'basic', name: 'basic1' });
      expect(user.authentication_type).to.eql('realm');
      // Do not assert on the `authentication_realm`, as the value differs for on-prem vs cloud
    });

    describe('login', () => {
      it('should properly set cookie and authenticate user', async () => {
        const response = await supertest.get('/security/account').expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = parseCookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);

        const { body: user } = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(user.username).to.eql('anonymous_user');
        expect(user.authentication_provider).to.eql({ type: 'anonymous', name: 'anonymous1' });
        expect(user.authentication_type).to.eql(
          isElasticsearchAnonymousAccessEnabled ? 'anonymous' : 'realm'
        );
        // Do not assert on the `authentication_realm`, as the value differs for on-prem vs cloud
      });

      it('should fail if `Authorization` header is present, but not valid', async () => {
        const unauthenticatedResponse = await supertest
          .get('/security/account')
          .set('Authorization', 'Basic wow')
          .expect(401);

        expect(unauthenticatedResponse.headers['set-cookie']).to.be(undefined);
        expect(unauthenticatedResponse.headers['content-security-policy']).to.be.a('string');
        expect(unauthenticatedResponse.text).to.contain('error');
      });
    });

    describe('API access with active session', () => {
      let sessionCookie: Cookie;

      beforeEach(async () => {
        const response = await supertest.get('/security/account').expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        sessionCookie = parseCookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);
      });

      it('should not extend cookie for system AND non-system API calls', async () => {
        const apiResponseOne = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(apiResponseOne.headers['set-cookie']).to.be(undefined);

        const systemAPIResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('kbn-system-request', 'true')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        expect(systemAPIResponse.headers['set-cookie']).to.be(undefined);
      });

      it('should fail and preserve session cookie if unsupported authentication schema is used', async () => {
        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Authorization', 'Basic ZHVtbXlfaGFja2VyOnBhc3M=')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);

        expect(apiResponse.body.statusCode).to.be(401);
        expect(apiResponse.body.error).to.be('Unauthorized');
        expect(apiResponse.body.message).to.include.string(
          'unable to authenticate user [dummy_hacker] for REST request [/_security/_authenticate]'
        );
        expect(apiResponse.headers['set-cookie']).to.be(undefined);
      });
    });

    describe('logging out', () => {
      it('should redirect to `logged_out` page after successful logout', async () => {
        // First authenticate user to retrieve session cookie.
        const response = await supertest.get('/security/account').expect(200);
        let cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = parseCookie(cookies[0])!;
        checkCookieIsSet(sessionCookie);

        // And then log user out.
        const logoutResponse = await supertest
          .get('/api/security/logout')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        cookies = logoutResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        checkCookieIsCleared(parseCookie(cookies[0])!);

        expect(logoutResponse.headers.location).to.be('/security/logged_out?msg=LOGGED_OUT');

        // Old cookie should be invalidated and not allow API access.
        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(401);

        // If Kibana detects cookie with invalid token it tries to clear it.
        cookies = apiResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        checkCookieIsCleared(parseCookie(cookies[0])!);
      });

      it('should redirect to home page if session cookie is not provided', async () => {
        const logoutResponse = await supertest.get('/api/security/logout').expect(302);

        expect(logoutResponse.headers['set-cookie']).to.be(undefined);
        expect(logoutResponse.headers.location).to.be('/security/logged_out?msg=LOGGED_OUT');
      });
    });

    describe('Audit Log', function () {
      const logFilePath = resolve(__dirname, '../../plugins/audit_log/anonymous.log');
      const logFile = new FileWrapper(logFilePath, retry);

      beforeEach(async () => {
        await logFile.reset();
      });

      it('should log a single `user_login` and `user_logout` event per session', async () => {
        // Accessing Kibana without an existing session should create a `user_login` event.
        const response = await supertest.get('/security/account').expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).to.have.length(1);
        const sessionCookie = parseCookie(cookies[0])!;

        // Accessing Kibana again using the same session should not create another `user_login` event.
        await supertest
          .get('/security/account')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);

        // Clearing the session should create a `user_logout` event.
        await supertest
          .get('/api/security/logout')
          .set('Cookie', sessionCookie.cookieString())
          .expect(302);

        await logFile.isWritten();
        const auditEvents = await logFile.readJSON();

        expect(auditEvents).to.have.length(2);

        expect(auditEvents[0]).to.be.ok();
        expect(auditEvents[0].event.action).to.be('user_login');
        expect(auditEvents[0].event.outcome).to.be('success');
        expect(auditEvents[0].trace.id).to.be.ok();
        expect(auditEvents[0].user.name).to.be('anonymous_user');
        expect(auditEvents[0].kibana.authentication_provider).to.be('anonymous1');

        expect(auditEvents[1]).to.be.ok();
        expect(auditEvents[1].event.action).to.be('user_logout');
        expect(auditEvents[1].event.outcome).to.be('unknown');
        expect(auditEvents[1].trace.id).to.be.ok();
        expect(auditEvents[1].user.name).to.be('anonymous_user');
        expect(auditEvents[1].kibana.authentication_provider).to.be('anonymous1');
      });
    });
  });
}
