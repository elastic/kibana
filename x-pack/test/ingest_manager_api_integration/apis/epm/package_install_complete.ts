/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import {
  PACKAGES_SAVED_OBJECT_TYPE,
  MAX_TIME_COMPLETE_INSTALL,
} from '../../../../plugins/ingest_manager/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const pkgName = 'multiple_versions';
  const pkgVersion = '0.1.0';
  const pkgUpdateVersion = '0.2.0';
  describe('setup checks packages completed install', async () => {
    describe('package install', async () => {
      before(async () => {
        await supertest
          .post(`/api/ingest_manager/epm/packages/${pkgName}-0.1.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true });
      });
      it('should have not reinstalled if package install completed', async function () {
        const packageBeforeSetup = await kibanaServer.savedObjects.get({
          type: 'epm-packages',
          id: pkgName,
        });
        const installStartedAtBeforeSetup = packageBeforeSetup.attributes.install_started_at;
        await supertest.post(`/api/ingest_manager/setup`).set('kbn-xsrf', 'xxx').send();
        const packageAfterSetup = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: pkgName,
        });
        const installStartedAfterSetup = packageAfterSetup.attributes.install_started_at;
        expect(installStartedAtBeforeSetup).equal(installStartedAfterSetup);
      });
      it('should have reinstalled if package installing did not complete in elapsed time', async function () {
        // change the saved object to installing to mock kibana crashing and not finishing the install
        const previousInstallDate = new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL).toISOString();
        await kibanaServer.savedObjects.update({
          id: pkgName,
          type: PACKAGES_SAVED_OBJECT_TYPE,
          attributes: {
            install_status: 'installing',
            install_started_at: previousInstallDate,
          },
        });
        await supertest.post(`/api/ingest_manager/setup`).set('kbn-xsrf', 'xxx').send();
        const packageAfterSetup = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: pkgName,
        });
        const installStartedAfterSetup = packageAfterSetup.attributes.install_started_at;
        expect(Date.parse(installStartedAfterSetup)).greaterThan(Date.parse(previousInstallDate));
        expect(packageAfterSetup.attributes.install_status).equal('installed');
      });
      it('should have not reinstalled if package installing did not surpass elapsed time', async function () {
        // change the saved object to installing to mock package still installing, but a time less than the max time allowable
        const previousInstallDate = new Date(Date.now()).toISOString();
        await kibanaServer.savedObjects.update({
          id: pkgName,
          type: PACKAGES_SAVED_OBJECT_TYPE,
          attributes: {
            install_status: 'installing',
            install_started_at: previousInstallDate,
          },
        });
        await supertest.post(`/api/ingest_manager/setup`).set('kbn-xsrf', 'xxx').send();
        const packageAfterSetup = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: pkgName,
        });
        const installStartedAfterSetup = packageAfterSetup.attributes.install_started_at;
        expect(Date.parse(installStartedAfterSetup)).equal(Date.parse(previousInstallDate));
        expect(packageAfterSetup.attributes.install_status).equal('installing');
      });
      after(async () => {
        await supertest
          .delete(`/api/ingest_manager/epm/packages/multiple_versions-0.1.0`)
          .set('kbn-xsrf', 'xxxx');
      });
    });
    describe('package update', async () => {
      before(async () => {
        await supertest
          .post(`/api/ingest_manager/epm/packages/${pkgName}-0.1.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true });
        await supertest
          .post(`/api/ingest_manager/epm/packages/${pkgName}-0.2.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true });
      });
      it('should have not reinstalled if package update completed', async function () {
        const packageBeforeSetup = await kibanaServer.savedObjects.get({
          type: 'epm-packages',
          id: pkgName,
        });
        const installStartedAtBeforeSetup = packageBeforeSetup.attributes.install_started_at;
        await supertest.post(`/api/ingest_manager/setup`).set('kbn-xsrf', 'xxx').send();
        const packageAfterSetup = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: pkgName,
        });
        const installStartedAfterSetup = packageAfterSetup.attributes.install_started_at;
        expect(installStartedAtBeforeSetup).equal(installStartedAfterSetup);
      });
      it('should have reinstalled if package updating did not complete in elapsed time', async function () {
        // change the saved object to installing to mock kibana crashing and not finishing the update
        const previousInstallDate = new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL).toISOString();
        await kibanaServer.savedObjects.update({
          id: pkgName,
          type: PACKAGES_SAVED_OBJECT_TYPE,
          attributes: {
            version: pkgVersion,
            install_status: 'installing',
            install_started_at: previousInstallDate,
            install_version: pkgUpdateVersion, // set version back
          },
        });
        await supertest.post(`/api/ingest_manager/setup`).set('kbn-xsrf', 'xxx').send();
        const packageAfterSetup = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: pkgName,
        });
        const installStartedAfterSetup = packageAfterSetup.attributes.install_started_at;
        expect(Date.parse(installStartedAfterSetup)).greaterThan(Date.parse(previousInstallDate));
        expect(packageAfterSetup.attributes.install_status).equal('installed');
        expect(packageAfterSetup.attributes.version).equal(pkgUpdateVersion);
        expect(packageAfterSetup.attributes.install_version).equal(pkgUpdateVersion);
      });
      it('should have not reinstalled if package updating did not surpass elapsed time', async function () {
        // change the saved object to installing to mock package still installing, but a time less than the max time allowable
        const previousInstallDate = new Date(Date.now()).toISOString();
        await kibanaServer.savedObjects.update({
          id: pkgName,
          type: PACKAGES_SAVED_OBJECT_TYPE,
          attributes: {
            install_status: 'installing',
            install_started_at: previousInstallDate,
            version: pkgVersion, // set version back
          },
        });
        await supertest.post(`/api/ingest_manager/setup`).set('kbn-xsrf', 'xxx').send();
        const packageAfterSetup = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: pkgName,
        });
        const installStartedAfterSetup = packageAfterSetup.attributes.install_started_at;
        expect(Date.parse(installStartedAfterSetup)).equal(Date.parse(previousInstallDate));
        expect(packageAfterSetup.attributes.install_status).equal('installing');
        expect(packageAfterSetup.attributes.version).equal(pkgVersion);
      });
      after(async () => {
        await supertest
          .delete(`/api/ingest_manager/epm/packages/multiple_versions-0.1.0`)
          .set('kbn-xsrf', 'xxxx');
      });
    });
  });
}
