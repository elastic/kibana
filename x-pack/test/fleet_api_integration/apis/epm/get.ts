/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const log = getService('log');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');

  const testPkgKey = 'apache-0.1.4';

  const uninstallPackage = async (pkg: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkg}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.zip'
  );

  describe('EPM - get', () => {
    it('returns package info from the registry if it was installed from the registry', async function () {
      if (server.enabled) {
        // this will install through the registry by default
        await installPackage(testPkgKey);
        const res = await supertest.get(`/api/fleet/epm/packages/${testPkgKey}`).expect(200);
        const packageInfo = res.body.response;
        // the uploaded version will have this description
        expect(packageInfo.description).to.not.equal('Apache Uploaded Test Integration');
        // download property should exist
        expect(packageInfo.download).to.not.equal(undefined);
        await uninstallPackage(testPkgKey);
      } else {
        warnAndSkipTest(this, log);
      }
    });
    it('returns correct package info if it was installed by upload', async function () {
      if (server.enabled) {
        const buf = fs.readFileSync(testPkgArchiveZip);
        await supertest
          .post(`/api/fleet/epm/packages`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/zip')
          .send(buf)
          .expect(200);

        const res = await supertest.get(`/api/fleet/epm/packages/${testPkgKey}`).expect(200);
        const packageInfo = res.body.response;
        // the uploaded version will have this description
        expect(packageInfo.description).to.equal('Apache Uploaded Test Integration');
        // download property should not exist on uploaded packages
        expect(packageInfo.download).to.equal(undefined);
        await uninstallPackage(testPkgKey);
      } else {
        warnAndSkipTest(this, log);
      }
    });
    it('returns correct package info from registry if a different version is installed by upload', async function () {
      if (server.enabled) {
        const buf = fs.readFileSync(testPkgArchiveZip);
        await supertest
          .post(`/api/fleet/epm/packages`)
          .set('kbn-xsrf', 'xxxx')
          .type('application/zip')
          .send(buf)
          .expect(200);

        const res = await supertest.get(`/api/fleet/epm/packages/apache-0.1.3`).expect(200);
        const packageInfo = res.body.response;
        expect(packageInfo.description).to.equal('Apache Integration');
        expect(packageInfo.download).to.not.equal(undefined);
        await uninstallPackage(testPkgKey);
      } else {
        warnAndSkipTest(this, log);
      }
    });
    it('returns a 500 for a package key without a proper name', async function () {
      if (server.enabled) {
        await supertest.get('/api/fleet/epm/packages/-0.1.0').expect(500);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('returns a 500 for a package key without a proper semver version', async function () {
      if (server.enabled) {
        await supertest.get('/api/fleet/epm/packages/endpoint-0.1.0.1.2.3').expect(500);
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
