/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');
  const users: { [rollName: string]: { username: string; password: string; permissions?: any } } = {
    fleet_user: {
      permissions: {
        feature: {
          fleet: ['read'],
        },
        spaces: ['*'],
      },
      username: 'fleet_user',
      password: 'changeme',
    },
    fleet_admin: {
      permissions: {
        feature: {
          fleet: ['all'],
        },
        spaces: ['*'],
      },
      username: 'fleet_admin',
      password: 'changeme',
    },
  };
  describe('fleet_agents_actions', () => {
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

    it('should return a 404 if the agent do not exists', async () => {
      await supertest
        .post(`/api/fleet/agents/i-do-not-exist/actions`)
        .auth(users.fleet_admin.username, users.fleet_admin.password)

        .send({
          type: 'PAUSE',
        })
        .set('kbn-xsrf', 'xx')
        .expect(404);
    });

    it('should return a 400 if the action is not invalid', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .auth(users.fleet_admin.username, users.fleet_admin.password)

        .send({
          type: 'INVALID_ACTION',
        })
        .set('kbn-xsrf', 'xx')
        .expect(400);
    });

    it('should return a 200 if the action is not invalid', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .auth(users.fleet_admin.username, users.fleet_admin.password)

        .send({
          type: 'PAUSE',
        })
        .set('kbn-xsrf', 'xx')
        .expect(200);
      expect(apiResponse.success).to.be(true);
      expect(apiResponse.item).to.have.keys(['id', 'type', 'created_at']);
    });

    it('should return a 404 if called by a user without permissions', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/actions`)
        .auth(users.fleet_user.username, users.fleet_user.password)
        .send({
          type: 'PAUSE',
        })
        .set('kbn-xsrf', 'xx')
        .expect(404);
    });

    // it('should return a 200 after deleting an agent', async () => {
    //   const { body: apiResponse } = await supertest
    //     .delete(`/api/fleet/agents/agent1`)
    //     .set('kbn-xsrf', 'xx')
    //     .expect(200);
    //   expect(apiResponse).to.eql({
    //     success: true,
    //     action: 'deleted',
    //   });
    // });
  });
}
