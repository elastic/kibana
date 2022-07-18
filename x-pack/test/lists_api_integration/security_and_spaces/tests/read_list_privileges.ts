/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { LIST_PRIVILEGES_URL } from '@kbn/securitysolution-list-constants';
import { getReadPrivilegeMock } from '@kbn/lists-plugin/server/routes/read_privileges_route.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const security = getService('security');
  const spacesService = getService('spaces');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('read_list_privileges', () => {
    const space1Id = 'space_1';

    const user1 = {
      username: 'user_1',
      roleName: 'user_1',
      password: 'user_1-password',
    };

    beforeEach(async () => {
      await spacesService.create({
        id: space1Id,
        name: space1Id,
        disabledFeatures: [],
      });

      await security.role.create(user1.roleName, {
        kibana: [
          {
            feature: {
              dashboard: ['all'],
              siem: ['all', 'read'],
            },
            spaces: [space1Id],
          },
        ],
      });

      await security.user.create(user1.username, {
        password: user1.password,
        roles: [user1.roleName],
      });
    });

    afterEach(async () => {
      await spacesService.delete(space1Id);
    });

    it('should return true for all privileges when its the system user of "elastic" in space of "default"', async () => {
      const { body } = await supertest.get(LIST_PRIVILEGES_URL).set('kbn-xsrf', 'true').expect(200);
      expect(body).to.eql(getReadPrivilegeMock());
    });

    it('should return true for all privileges when its the system user of "elastic" in space of "space_1"', async () => {
      const { body } = await supertest.get(LIST_PRIVILEGES_URL).set('kbn-xsrf', 'true').expect(200);
      expect(body).to.eql(getReadPrivilegeMock());
    });

    it('should return false for all privileges when its the system user of "user_1" in a space of "space_1"', async () => {
      const { body } = await supertestWithoutAuth
        .get(`/s/${space1Id}${LIST_PRIVILEGES_URL}`)
        .auth(user1.username, user1.password)
        .send()
        .expect(200);

      const privilege = getReadPrivilegeMock(
        `.lists-${space1Id}`,
        `.items-${space1Id}`,
        user1.username,
        false
      );

      expect(body).to.eql(privilege);
    });
  });
};
