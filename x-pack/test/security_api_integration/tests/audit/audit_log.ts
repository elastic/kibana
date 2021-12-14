/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

class FileWrapper {
  constructor(private readonly path: string) {}
  async reset() {
    // "touch" each file to ensure it exists and is empty before each test
    await Fs.promises.writeFile(this.path, '');
  }
  async read() {
    const content = await Fs.promises.readFile(this.path, { encoding: 'utf8' });
    return content.trim().split('\n');
  }
  async readJSON() {
    const content = await this.read();
    try {
      return content.map((l) => JSON.parse(l));
    } catch (err) {
      const contentString = content.join('\n');
      throw new Error(
        `Failed to parse audit log JSON, error: "${err.message}", audit.log contents:\n${contentString}`
      );
    }
  }
  // writing in a file is an async operation. we use this method to make sure logs have been written.
  async isNotEmpty() {
    const content = await this.read();
    const line = content[0];
    return line.length > 0;
  }
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const { username, password } = getService('config').get('servers.kibana');

  // FLAKY: https://github.com/elastic/kibana/issues/119267
  describe.skip('Audit Log', function () {
    const logFilePath = Path.resolve(__dirname, '../../fixtures/audit/audit.log');
    const logFile = new FileWrapper(logFilePath);

    beforeEach(async () => {
      await logFile.reset();
    });

    it('logs audit events when reading and writing saved objects', async () => {
      await supertest.get('/audit_log?query=param').set('kbn-xsrf', 'foo').expect(204);
      await retry.waitFor('logs event in the dest file', async () => await logFile.isNotEmpty());

      const content = await logFile.readJSON();

      const httpEvent = content.find((c) => c.event.action === 'http_request');
      expect(httpEvent).to.be.ok();
      expect(httpEvent.trace.id).to.be.ok();
      expect(httpEvent.user.name).to.be(username);
      expect(httpEvent.kibana.space_id).to.be('default');
      expect(httpEvent.http.request.method).to.be('get');
      expect(httpEvent.url.path).to.be('/audit_log');
      expect(httpEvent.url.query).to.be('query=param');

      const createEvent = content.find((c) => c.event.action === 'saved_object_create');
      expect(createEvent).to.be.ok();
      expect(createEvent.trace.id).to.be.ok();
      expect(createEvent.user.name).to.be(username);
      expect(createEvent.kibana.space_id).to.be('default');

      const findEvent = content.find((c) => c.event.action === 'saved_object_find');
      expect(findEvent).to.be.ok();
      expect(findEvent.trace.id).to.be.ok();
      expect(findEvent.user.name).to.be(username);
      expect(findEvent.kibana.space_id).to.be('default');
    });

    it('logs audit events when logging in successfully', async () => {
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username, password },
        })
        .expect(200);
      await retry.waitFor('logs event in the dest file', async () => await logFile.isNotEmpty());

      const content = await logFile.readJSON();

      const loginEvent = content.find((c) => c.event.action === 'user_login');
      expect(loginEvent).to.be.ok();
      expect(loginEvent.event.outcome).to.be('success');
      expect(loginEvent.trace.id).to.be.ok();
      expect(loginEvent.user.name).to.be(username);
    });

    it('logs audit events when failing to log in', async () => {
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username, password: 'invalid_password' },
        })
        .expect(401);
      await retry.waitFor('logs event in the dest file', async () => await logFile.isNotEmpty());

      const content = await logFile.readJSON();

      const loginEvent = content.find((c) => c.event.action === 'user_login');
      expect(loginEvent).to.be.ok();
      expect(loginEvent.event.outcome).to.be('failure');
      expect(loginEvent.trace.id).to.be.ok();
      expect(loginEvent.user).not.to.be.ok();
    });
  });
}
