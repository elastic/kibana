/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const fleetAndAgents = getService('fleetAndAgents');
  const testPkgName = 'apache';

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (name: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('EPM - get', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    describe('Pkg verification', () => {
      it('allows user with only package level permission to access corresponding packages', async function () {
        const pkg = 'endpoint';
        const pkgVersion = '8.6.0';
        await installPackage(pkg, pkgVersion);
        const response = await supertestWithoutAuth
          .get(`/api/fleet/epm/packages/${pkg}/${pkgVersion}`)
          .auth(
            testUsers.endpoint_integr_read_only_fleet_none.username,
            testUsers.endpoint_integr_read_only_fleet_none.password
          )
          .expect(200);
        expect(response.body.item.name).to.be(pkg);
        expect(response.body.item.version).to.be(pkgVersion);
        await uninstallPackage(pkg, pkgVersion);
      });

      it('rejects user with only package level permission to access unauthorized packages', async function () {
        const response = await supertestWithoutAuth
          .get(`/api/fleet/epm/packages/${testPkgName}`)
          .auth(
            testUsers.endpoint_integr_read_only_fleet_none.username,
            testUsers.endpoint_integr_read_only_fleet_none.password
          )
          .expect(403);
        expect(response.body.message).to.be(
          'Authorization denied to package: apache. Allowed package(s): endpoint'
        );
      });
    });
  });
}
