/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const requiredPackage = 'elastic_agent';
  const pkgVersion = '0.0.7';

  const installPackage = async (name: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const deletePackage = async (name: string, version: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('delete and force delete scenarios', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    before(async () => {
      await installPackage(requiredPackage, pkgVersion);
    });
    after(async () => {
      await deletePackage(requiredPackage, pkgVersion);
    });

    it('should return 200 if trying to uninstall a required package', async function () {
      await supertest
        .delete(`/api/fleet/epm/packages/${requiredPackage}/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it.skip('should return 200 if trying to force uninstall a required package', async function () {
      await supertest
        .delete(`/api/fleet/epm/packages/${requiredPackage}/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    it('should return 403 for users without integrations all permissions', async () => {
      await supertestWithoutAuth
        .delete(`/api/fleet/epm/packages/${requiredPackage}/${pkgVersion}`)
        .auth(testUsers.fleet_all_int_read.username, testUsers.fleet_all_int_read.password)
        .set('kbn-xsrf', 'xxxx')
        .expect(403);
    });

    it('should return 403 for users without fleet all permissions', async () => {
      await supertestWithoutAuth
        .delete(`/api/fleet/epm/packages/${requiredPackage}/${pkgVersion}`)
        .auth(testUsers.integr_all_only.username, testUsers.integr_all_only.password)
        .set('kbn-xsrf', 'xxxx')
        .expect(403);
    });
  });
}
