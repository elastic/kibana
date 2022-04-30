/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  PACKAGES_SAVED_OBJECT_TYPE,
  MAX_TIME_COMPLETE_INSTALL,
} from '../../../../plugins/fleet/common';
import { skipIfNoDockerRegistry } from '../../helpers';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');
  const pkgName = 'multiple_versions';
  const pkgVersion = '0.1.0';
  const pkgUpdateVersion = '0.2.0';
  describe('setup checks packages completed install', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    describe('package install', async () => {
      before(async () => {
        if (!server.enabled) return;
        await supertest
          .post(`/api/fleet/epm/packages/${pkgName}/0.1.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });
      it('should have not reinstalled if package install completed', async function () {
        const packageBeforeSetup = await kibanaServer.savedObjects.get({
          type: 'epm-packages',
          id: pkgName,
        });
        const installStartedAtBeforeSetup = packageBeforeSetup.attributes.install_started_at;
        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').expect(200);
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
        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').expect(200);
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
        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').expect(200);
        const packageAfterSetup = await kibanaServer.savedObjects.get({
          type: PACKAGES_SAVED_OBJECT_TYPE,
          id: pkgName,
        });
        const installStartedAfterSetup = packageAfterSetup.attributes.install_started_at;
        expect(Date.parse(installStartedAfterSetup)).equal(Date.parse(previousInstallDate));
        expect(packageAfterSetup.attributes.install_status).equal('installing');
      });
      after(async () => {
        if (!server.enabled) return;
        await supertest
          .delete(`/api/fleet/epm/packages/multiple_versions/0.1.0`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });
    });
    describe('package update', async () => {
      before(async () => {
        if (!server.enabled) return;
        await supertest
          .post(`/api/fleet/epm/packages/${pkgName}/0.1.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
        await supertest
          .post(`/api/fleet/epm/packages/${pkgName}/0.2.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });
      it('should have not reinstalled if package update completed', async function () {
        const packageBeforeSetup = await kibanaServer.savedObjects.get({
          type: 'epm-packages',
          id: pkgName,
        });
        const installStartedAtBeforeSetup = packageBeforeSetup.attributes.install_started_at;
        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').expect(200);
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
        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').expect(200);
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
        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').expect(200);
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
        if (!server.enabled) return;
        await supertest
          .delete(`/api/fleet/epm/packages/multiple_versions/0.1.0`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });
    });
  });
}
