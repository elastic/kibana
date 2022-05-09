/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGES_SAVED_OBJECT_TYPE, MAX_TIME_COMPLETE_INSTALL } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('installing and updating scenarios', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    after(async () => {
      await deletePackage('multiple_versions', '0.3.0');
    });

    it('should return 404 if package does not exist', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/nonexistent/0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(404);
      let res;
      try {
        res = await kibanaServer.savedObjects.get({
          type: 'epm-package',
          id: 'nonexistent',
        });
      } catch (err) {
        res = err;
      }
      expect(res.response.data.statusCode).equal(404);
    });
    it('should return 400 if trying to install an out-of-date package', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/multiple_versions/0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(400);
      let res;
      try {
        res = await kibanaServer.savedObjects.get({
          type: 'epm-package',
          id: 'update',
        });
      } catch (err) {
        res = err;
      }
      expect(res.response.data.statusCode).equal(404);
    });
    it('should return 200 if trying to force install an out-of-date package', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/multiple_versions/0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });
    it('should return 200 if trying to reinstall an out-of-date package', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/multiple_versions/0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });
    it('should return 400 if trying to update to an out-of-date package', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/multiple_versions/0.2.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(400);
    });
    it('should return 200 if trying to force update to an out-of-date package', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/multiple_versions/0.2.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });
    it('should return 200 if trying to reupdate an out-of-date package', async function () {
      const previousInstallDate = new Date(Date.now() - MAX_TIME_COMPLETE_INSTALL).toISOString();
      // mock package to be stuck installing an update
      await kibanaServer.savedObjects.update({
        id: 'multiple_versions',
        type: PACKAGES_SAVED_OBJECT_TYPE,
        attributes: {
          install_status: 'installing',
          install_started_at: previousInstallDate,
          install_version: '0.2.0',
          version: '0.1.0',
        },
      });
      await supertest
        .post(`/api/fleet/epm/packages/multiple_versions/0.2.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });
    it('should return 200 if trying to update to the latest package', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/multiple_versions/0.3.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      await deletePackage('multiple_versions', '0.3.0');
    });
    it('should return 200 if trying to install the latest package', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/multiple_versions/0.3.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });
  });
}
