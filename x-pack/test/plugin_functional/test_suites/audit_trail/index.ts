/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    return content.map((l) => JSON.parse(l));
  }
  // writing in a file is an async operation. we use this method to make sure logs have been written.
  async isNotEmpty() {
    const content = await this.read();
    const line = content[0];
    return line.length > 0;
  }
}

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('Audit trail service', function () {
    this.tags('ciGroup7');
    const logFilePath = Path.resolve(
      __dirname,
      '../../plugins/audit_trail_test/server/pattern_debug.log'
    );
    const logFile = new FileWrapper(logFilePath);

    beforeEach(async () => {
      await logFile.reset();
    });

    it('logs current user access to elasticsearch via RequestHandlerContext', async () => {
      await supertest
        .get('/audit_trail_test/context/as_current_user')
        .set('kbn-xsrf', 'foo')
        .expect(204);

      await retry.waitFor('logs event in the dest file', async () => {
        return await logFile.isNotEmpty();
      });

      const content = await logFile.readJSON();
      const pingCall = content.find(
        (c) => c.meta.scope === 'audit_trail_test/context/as_current_user'
      );
      expect(pingCall).to.be.ok();
      expect(pingCall.meta.type).to.be('elasticsearch.call.currentUser');
      expect(pingCall.meta.user).to.be('elastic');
      expect(pingCall.meta.space).to.be('default');
    });

    it('logs internal user access to elasticsearch via RequestHandlerContext', async () => {
      await supertest
        .get('/audit_trail_test/context/as_internal_user')
        .set('kbn-xsrf', 'foo')
        .expect(204);

      await retry.waitFor('logs event in the dest file', async () => {
        return await logFile.isNotEmpty();
      });

      const content = await logFile.readJSON();
      const pingCall = content.find(
        (c) => c.meta.scope === 'audit_trail_test/context/as_internal_user'
      );
      expect(pingCall).to.be.ok();
      expect(pingCall.meta.type).to.be('elasticsearch.call.internalUser');
      expect(pingCall.meta.user).to.be('elastic');
      expect(pingCall.meta.space).to.be('default');
    });

    it('logs current user access to elasticsearch via coreStart contract', async () => {
      await supertest
        .get('/audit_trail_test/contract/as_current_user')
        .set('kbn-xsrf', 'foo')
        .expect(204);

      await retry.waitFor('logs event in the dest file', async () => {
        return await logFile.isNotEmpty();
      });

      const content = await logFile.readJSON();
      const pingCall = content.find(
        (c) => c.meta.scope === 'audit_trail_test/contract/as_current_user'
      );
      expect(pingCall).to.be.ok();
      expect(pingCall.meta.type).to.be('elasticsearch.call.currentUser');
      expect(pingCall.meta.user).to.be('elastic');
      expect(pingCall.meta.space).to.be('default');
    });

    it('logs internal user access to elasticsearch via coreStart contract', async () => {
      await supertest
        .get('/audit_trail_test/contract/as_internal_user')
        .set('kbn-xsrf', 'foo')
        .expect(204);

      await retry.waitFor('logs event in the dest file', async () => {
        return await logFile.isNotEmpty();
      });

      const content = await logFile.readJSON();
      const pingCall = content.find(
        (c) => c.meta.scope === 'audit_trail_test/contract/as_internal_user'
      );
      expect(pingCall).to.be.ok();
      expect(pingCall.meta.type).to.be('elasticsearch.call.internalUser');
      expect(pingCall.meta.user).to.be('elastic');
      expect(pingCall.meta.space).to.be('default');
    });
  });
}
