/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('EPM - list', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('list api tests', async () => {
      it('lists all packages from the registry', async function () {
        const fetchPackageList = async () => {
          const response = await supertest
            .get('/api/fleet/epm/packages')
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };
        const listResponse = await fetchPackageList();
        expect(listResponse.items.length).not.to.be(0);
      });

      it('lists all limited packages from the registry', async function () {
        const fetchLimitedPackageList = async () => {
          const response = await supertest
            .get('/api/fleet/epm/packages/limited')
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };
        const listResponse = await fetchLimitedPackageList();

        expect(listResponse.items.sort()).to.eql(['endpoint'].sort());
      });

      it('allows user with only fleet permission to access', async () => {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages')
          .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
          .expect(200);
      });
      it('allows user with only integrations permission to access', async () => {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages')
          .auth(testUsers.integr_all_only.username, testUsers.integr_all_only.password)
          .expect(200);
      });
      it('allows user with integrations read permission to access', async () => {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages')
          .auth(testUsers.fleet_all_int_read.username, testUsers.fleet_all_int_read.password)
          .expect(200);
      });
      it('does not allow user with the correct permissions', async () => {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages')
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .expect(403);
      });
    });
  });
}
