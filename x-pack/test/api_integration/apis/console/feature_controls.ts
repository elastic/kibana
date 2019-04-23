/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityService, SpacesService } from '../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function securityTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertestWithoutAuth');
  const security: SecurityService = getService('security');
  const spaces: SpacesService = getService('spaces');

  describe('/api/console/proxy', () => {
    it('cannot be accessed by an anonymous user', async () => {
      await supertest
        .post(`/api/console/proxy?method=GET&path=${encodeURIComponent('/_cat')}`)
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(401);
    });

    it('can be accessed by kibana_user role', async () => {
      const username = 'kibana_user';
      const roleName = 'kibana_user';
      try {
        const password = `${username}-password`;

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await supertest
          .post(`/api/console/proxy?method=GET&path=${encodeURIComponent('/_cat')}`)
          .auth(username, password)
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
      } finally {
        await security.user.delete(username);
      }
    });

    it('can be accessed by global all role', async () => {
      const username = 'global_all';
      const roleName = 'global_all';
      try {
        const password = `${username}-password`;

        await security.role.create(roleName, {
          kibana: [
            {
              base: ['all'],
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
        });

        await supertest
          .post(`/api/console/proxy?method=GET&path=${encodeURIComponent('/_cat')}`)
          .auth(username, password)
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it('can be accessed by global read role', async () => {
      const username = 'global_read';
      const roleName = 'global_read';
      try {
        const password = `${username}-password`;

        await security.role.create(roleName, {
          kibana: [
            {
              base: ['read'],
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
        });

        await supertest
          .post(`/api/console/proxy?method=GET&path=${encodeURIComponent('/_cat')}`)
          .auth(username, password)
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    // this could be any role which doesn't have access to the dev_tools feature
    it(`can't be accessed by a user with dashboard all access`, async () => {
      const username = 'dashboard_all';
      const roleName = 'dashboard_all';
      try {
        const password = `${username}-password`;

        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
        });

        await supertest
          .post(`/api/console/proxy?method=GET&path=${encodeURIComponent('/_cat')}`)
          .auth(username, password)
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(404);
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    describe('spaces', () => {
      // the following tests create a user_1 which has dev_tools all access to space_1 and dashboard access to space_2
      const space1Id = 'space_1';
      const user1 = {
        username: 'user_1',
        roleName: 'user_1',
        password: 'user_1-password',
      };

      const space2Id = 'space_2';

      before(async () => {
        await spaces.create({
          id: space1Id,
          name: space1Id,
          disabledFeatures: [],
        });
        await security.role.create(user1.roleName, {
          kibana: [
            {
              feature: {
                dev_tools: ['all'],
              },
              spaces: [space1Id],
            },
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: [space2Id],
            },
          ],
        });
        await security.user.create(user1.username, {
          password: user1.password,
          roles: [user1.roleName],
        });

        await spaces.create({
          id: space2Id,
          name: space2Id,
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spaces.delete(space1Id);
        await spaces.delete(space2Id);
        await security.role.delete(user1.roleName);
        await security.user.delete(user1.username);
      });

      it('user_1 can access dev_tools in space_1', async () => {
        await supertest
          .post(`/s/${space1Id}/api/console/proxy?method=GET&path=${encodeURIComponent('/_cat')}`)
          .auth(user1.username, user1.password)
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
      });

      it(`user_1 can't access dev_tools in space_2`, async () => {
        await supertest
          .post(`/s/${space2Id}/api/console/proxy?method=GET&path=${encodeURIComponent('/_cat')}`)
          .auth(user1.username, user1.password)
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(404);
      });
    });
  });
}
