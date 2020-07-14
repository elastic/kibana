/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');
  const users: { [rollName: string]: { username: string; password: string; permissions?: any } } = {
    kibana_basic_user: {
      permissions: {
        feature: {
          dashboards: ['read'],
        },
        spaces: ['*'],
      },
      username: 'kibana_basic_user',
      password: 'changeme',
    },
    fleet_user: {
      permissions: {
        feature: {
          ingestManager: ['read'],
        },
        spaces: ['*'],
      },
      username: 'fleet_user',
      password: 'changeme',
    },
    fleet_admin: {
      permissions: {
        feature: {
          ingestManager: ['all'],
        },
        spaces: ['*'],
      },
      username: 'fleet_admin',
      password: 'changeme',
    },
  };

  describe('fleet_list_agent', () => {
    before(async () => {
      for (const roleName in users) {
        if (users.hasOwnProperty(roleName)) {
          const user = users[roleName];

          if (user.permissions) {
            await security.role.create(roleName, {
              kibana: [user.permissions],
            });
          }

          // Import a repository first
          await security.user.create(user.username, {
            password: user.password,
            roles: [roleName],
            full_name: user.username,
          });
        }
      }

      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should return the list of agents when requesting as a user with fleet write permissions', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/ingest_manager/fleet/agents`)
        .auth(users.fleet_admin.username, users.fleet_admin.password)
        .expect(200);

      expect(apiResponse).to.have.keys('success', 'page', 'total', 'list');
      expect(apiResponse.success).to.eql(true);
      expect(apiResponse.total).to.eql(4);
    });
    it('should return the list of agents when requesting as a user with fleet read permissions', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/ingest_manager/fleet/agents`)
        .auth(users.fleet_user.username, users.fleet_user.password)
        .expect(200);
      expect(apiResponse).to.have.keys('success', 'page', 'total', 'list');
      expect(apiResponse.success).to.eql(true);
      expect(apiResponse.total).to.eql(4);
    });
    it('should not return the list of agents when requesting as a user without fleet permissions', async () => {
      await supertest
        .get(`/api/ingest_manager/fleet/agents`)
        .auth(users.kibana_basic_user.username, users.kibana_basic_user.password)
        .expect(404);
    });
  });
}
