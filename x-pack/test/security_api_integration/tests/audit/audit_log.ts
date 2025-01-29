/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import expect from '@kbn/expect';

import { FileWrapper } from './file_wrapper';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const { username, password } = getService('config').get('servers.kibana');

  describe('Audit Log', function () {
    const logFilePath = Path.resolve(__dirname, '../../plugins/audit_log/audit.log');
    const logFile = new FileWrapper(logFilePath, retry);

    beforeEach(async () => {
      await logFile.reset();
    });

    it('logs audit events when reading and writing saved objects', async () => {
      await supertest.get('/audit_log?query=param').set('kbn-xsrf', 'foo').expect(204);
      await logFile.isWritten();
      const content = await logFile.readJSON();

      const httpEvent = content.find(
        (c) => c.event.action === 'http_request' && c.url.path === '/audit_log'
      );
      expect(httpEvent).to.be.ok();
      expect(httpEvent.trace.id).to.be.ok();

      expect(httpEvent.user.name).to.be(username);
      expect(httpEvent.kibana.space_id).to.be('default');
      expect(httpEvent.http.request.method).to.be('get');
      expect(httpEvent.url.query).to.be('query=param');

      const createEvent = content.find(
        (c) =>
          c.event.action === 'saved_object_create' && c.kibana.saved_object.type === 'dashboard'
      );

      expect(createEvent).to.be.ok();
      expect(createEvent.trace.id).to.be.ok();
      expect(createEvent.user.name).to.be(username);
      expect(createEvent.kibana.space_id).to.be('default');

      // There are two 'saved_object_find' events in the log. One is by the fleet app for
      // "epm - packages", the other is by the user for a dashboard (this is the one we are
      // concerned with).
      const findEvent = content.find(
        (c) => c.event.action === 'saved_object_find' && c.kibana.saved_object.type === 'dashboard'
      );
      expect(findEvent).to.be.ok();
      expect(findEvent.trace.id).to.be.ok();
      expect(findEvent.user.name).to.be(username);
      expect(findEvent.kibana.space_id).to.be('default');
    });

    it('logs audit events when logging in successfully', async () => {
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .set('X-Forwarded-For', '1.1.1.1, 2.2.2.2')
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username, password },
        })
        .expect(200);
      await logFile.isWritten();
      const content = await logFile.readJSON();

      const loginEvent = content.find((c) => c.event.action === 'user_login');
      expect(loginEvent).to.be.ok();
      expect(loginEvent.event.outcome).to.be('success');
      expect(loginEvent.trace.id).to.be.ok();
      expect(loginEvent.user.name).to.be(username);
      expect(loginEvent.client.ip).to.be.ok();
      expect(loginEvent.http.request.headers['x-forwarded-for']).to.be('1.1.1.1, 2.2.2.2');
    });

    it('logs audit events when failing to log in', async () => {
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .set('X-Forwarded-For', '1.1.1.1, 2.2.2.2')
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username, password: 'invalid_password' },
        })
        .expect(401);
      await logFile.isWritten();
      const content = await logFile.readJSON();

      const loginEvent = content.find((c) => c.event.action === 'user_login');
      expect(loginEvent).to.be.ok();
      expect(loginEvent.event.outcome).to.be('failure');
      expect(loginEvent.trace.id).to.be.ok();
      expect(loginEvent.user).not.to.be.ok();
      expect(loginEvent.client.ip).to.be.ok();
      expect(loginEvent.http.request.headers['x-forwarded-for']).to.be('1.1.1.1, 2.2.2.2');
    });
  });
}
