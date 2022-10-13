/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');
  const users: {
    [roleName: string]: { username: string; password: string; permissions?: any; roles?: string[] };
  } = {
    fleet_user: {
      permissions: {
        feature: {
          fleet: ['all'],
          fleetv2: ['none'],
        },
        spaces: ['*'],
      },
      username: 'fleet_user',
      password: 'changeme',
    },
    fleet_admin: {
      permissions: {
        feature: {
          fleetv2: ['all'],
          fleet: ['all'],
        },
        spaces: ['*'],
      },
      username: 'fleet_admin',
      password: 'changeme',
    },
  };
  describe('fleet_delete_agent', () => {
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
            roles: [roleName, ...(user.roles || [])],
            full_name: user.username,
          });
        }
      }

      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });
    it('should return a 403 if user lacks fleet all permissions', async () => {
      const { body: apiResponse } = await supertest
        .delete(`/api/fleet/agents/agent1`)
        .auth(users.fleet_user.username, users.fleet_user.password)
        .set('kbn-xsrf', 'xx')
        .expect(403);

      expect(apiResponse).not.to.eql({
        action: 'deleted',
      });
    });

    it('should return a 404 if there is no agent to delete', async () => {
      await supertest
        .delete(`/api/fleet/agents/i-do-not-exist`)
        .auth(users.fleet_admin.username, users.fleet_admin.password)
        .set('kbn-xsrf', 'xx')
        .expect(404);
    });

    it('should return a 200 after deleting an agent', async () => {
      const { body: apiResponse } = await supertest
        .delete(`/api/fleet/agents/agent1`)
        .auth(users.fleet_admin.username, users.fleet_admin.password)
        .set('kbn-xsrf', 'xx')
        .expect(200);
      expect(apiResponse).to.eql({
        action: 'deleted',
      });
    });
  });
}
