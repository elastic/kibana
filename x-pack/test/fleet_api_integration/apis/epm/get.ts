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
import { setupFleetAndAgents } from '../agents/services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const testPkgName = 'apache';
  const testPkgVersion = '0.1.4';

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (name: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.zip'
  );

  describe('EPM - get', () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    it('returns package info from the registry if it was installed from the registry', async function () {
      // this will install through the registry by default
      await installPackage(testPkgName, testPkgVersion);
      const res = await supertest
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .expect(200);
      const packageInfo = res.body.item;
      // the uploaded version will have this description
      expect(packageInfo.description).to.not.equal('Apache Uploaded Test Integration');
      // download property should exist
      expect(packageInfo.download).to.not.equal(undefined);
      await uninstallPackage(testPkgName, testPkgVersion);
    });
    it('returns correct package info if it was installed by upload', async function () {
      const buf = fs.readFileSync(testPkgArchiveZip);
      await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);

      const res = await supertest
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .expect(200);
      const packageInfo = res.body.item;
      // Get package info always return data from the registry
      expect(packageInfo.description).to.not.equal('Apache Uploaded Test Integration');
      // download property exist on uploaded packages
      expect(packageInfo.download).to.not.equal(undefined);
      await uninstallPackage(testPkgName, testPkgVersion);
    });
    it('returns correct package info from registry if a different version is installed by upload', async function () {
      const buf = fs.readFileSync(testPkgArchiveZip);
      await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);

      const res = await supertest.get(`/api/fleet/epm/packages/apache/0.1.3`).expect(200);
      const packageInfo = res.body.item;
      expect(packageInfo.description).to.equal('Apache Integration');
      expect(packageInfo.download).to.not.equal(undefined);
      await uninstallPackage(testPkgName, testPkgVersion);
    });

    it('returns correct package info from upload if a uploaded version is not in registry', async function () {
      const testPkgArchiveZipV9999 = path.join(
        path.dirname(__filename),
        '../fixtures/direct_upload_packages/apache_9999.0.0.zip'
      );
      const buf = fs.readFileSync(testPkgArchiveZipV9999);
      await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);

      const res = await supertest.get(`/api/fleet/epm/packages/apache/9999.0.0`).expect(200);
      const packageInfo = res.body.item;
      expect(packageInfo.description).to.equal('Apache Uploaded Test Integration');
      expect(packageInfo.download).to.equal(undefined);
      await uninstallPackage(testPkgName, '9999.0.0');
    });

    it('returns a 404 for a package that do not exists', async function () {
      await supertest.get('/api/fleet/epm/packages/notexists/99.99.99').expect(404);
    });

    it('returns a 400 for a package key without a proper semver version', async function () {
      await supertest.get('/api/fleet/epm/packages/endpoint/0.1.0.1.2.3').expect(400);
    });

    it('allows user with only fleet permission to access', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
        .expect(200);
    });
    it('allows user with only integrations permission to access', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .auth(testUsers.integr_all_only.username, testUsers.integr_all_only.password)
        .expect(200);
    });
    it('allows user with integrations read permission to access', async () => {
      await supertestWithoutAuth
        .get(`/api/fleet/epm/packages/${testPkgName}/${testPkgVersion}`)
        .auth(testUsers.fleet_all_int_read.username, testUsers.fleet_all_int_read.password)
        .expect(200);
    });

    it('returns package info in item field when calling without version', async function () {
      // this will install through the registry by default
      await installPackage(testPkgName, testPkgVersion);
      const res = await supertest.get(`/api/fleet/epm/packages/${testPkgName}`).expect(200);
      const packageInfo = res.body.item;
      // the uploaded version will have this description
      expect(packageInfo.name).to.equal('apache');
      await uninstallPackage(testPkgName, testPkgVersion);
    });
  });
}
