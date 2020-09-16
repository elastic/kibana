/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const log = getService('log');

  const testPkgArchiveTgz = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.tar.gz'
  );
  const testPkgKey = 'apache-0.14';
  const server = dockerServers.get('registry');

  const deletePackage = async (pkgkey: string) => {
    await supertest.delete(`/api/ingest_manager/epm/packages/${pkgkey}`).set('kbn-xsrf', 'xxxx');
  };

  describe('installs packages from direct upload', async () => {
    after(async () => {
      if (server.enabled) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(testPkgKey);
      }
    });

    it('should install a tar archive correctly', async function () {
      if (server.enabled) {
        const buf = fs.readFileSync(testPkgArchiveTgz);
        const res = await supertest
          .post(`/api/ingest_manager/epm/packages`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/gzip')
          .send(buf)
          .expect(200);
        expect(res.body.response).to.equal(
          'package upload was received ok, but not installed (not implemented yet)'
        );
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
