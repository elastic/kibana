/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');

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
    skipIfNoDockerRegistry(providerContext);
    it('returns package info from the registry if it was installed from the registry', async function () {
      // this will install through the registry by default
      await installPackage(testPkgKey);
      const res = await supertest.get(`/api/fleet/epm/packages/${testPkgKey}`).expect(200);
      const packageInfo = res.body.response;
      // the uploaded version will have this description
      expect(packageInfo.description).to.not.equal('Apache Uploaded Test Integration');
      // download property should exist
      expect(packageInfo.download).to.not.equal(undefined);
      await uninstallPackage(testPkgKey);
    });
    it('returns correct package info if it was installed by upload', async function () {
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
    });
    it('returns correct package info from registry if a different version is installed by upload', async function () {
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
    });
    it('returns a 400 for a package key without a proper name', async function () {
      await supertest.get('/api/fleet/epm/packages/-0.1.0').expect(400);
    });

    it('returns a 404 for a package that do not exists', async function () {
      await supertest.get('/api/fleet/epm/packages/notexists-99.99.99').expect(404);
    });

    it('returns a 400 for a package key without a proper semver version', async function () {
      await supertest.get('/api/fleet/epm/packages/endpoint-0.1.0.1.2.3').expect(400);
    });
  });
}
