/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import { resolve } from 'path';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

import { FileWrapper } from '../audit/file_wrapper';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const retry = getService('retry');

  describe('Audit Log', function () {
    const logFilePath = resolve(__dirname, '../../packages/helpers/audit/token.log');
    const logFile = new FileWrapper(logFilePath, retry);

    beforeEach(async () => {
      await logFile.reset();
    });

    it('should log a single `user_login` and `user_logout` event per session', async () => {
      // Signing in should create a `user_login` event.
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { username: 'elastic', password: 'changeme' },
        })
        .expect(200);

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
      expect(auditEvents[0].user.name).to.be('elastic');
      expect(auditEvents[0].kibana.authentication_provider).to.be('token');

      expect(auditEvents[1]).to.be.ok();
      expect(auditEvents[1].event.action).to.be('user_logout');
      expect(auditEvents[1].event.outcome).to.be('unknown');
      expect(auditEvents[1].trace.id).to.be.ok();
      expect(auditEvents[1].user.name).to.be('elastic');
      expect(auditEvents[1].kibana.authentication_provider).to.be('token');
    });

    it('should log authentication failure correctly', async () => {
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { username: 'elastic', password: 'notvalidpassword' },
        })
        .expect(401);

      await logFile.isWritten();
      const auditEvents = await logFile.readJSON();

      expect(auditEvents).to.have.length(1);
      expect(auditEvents[0]).to.be.ok();
      expect(auditEvents[0].event.action).to.be('user_login');
      expect(auditEvents[0].event.outcome).to.be('failure');
      expect(auditEvents[0].trace.id).to.be.ok();
      expect(auditEvents[0].kibana.authentication_provider).to.be('token');
    });
  });
}
