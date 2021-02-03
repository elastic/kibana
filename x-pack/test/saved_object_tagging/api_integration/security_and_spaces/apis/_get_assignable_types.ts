/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { USERS, User } from '../../../common/lib';
import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');

  describe('GET /internal/saved_objects_tagging/assignments/_assignable_types', () => {
    before(async () => {
      await esArchiver.load('rbac_tags');
    });

    after(async () => {
      await esArchiver.unload('rbac_tags');
    });

    const assignablePerUser = {
      [USERS.SUPERUSER.username]: ['dashboard', 'visualization', 'map', 'lens'],
      [USERS.DEFAULT_SPACE_SO_TAGGING_READ_USER.username]: [],
      [USERS.DEFAULT_SPACE_READ_USER.username]: [],
      [USERS.DEFAULT_SPACE_ADVANCED_SETTINGS_READ_USER.username]: [],
      [USERS.DEFAULT_SPACE_DASHBOARD_WRITE_USER.username]: ['dashboard'],
      [USERS.DEFAULT_SPACE_VISUALIZE_WRITE_USER.username]: ['visualization', 'lens'],
    };

    const createUserTest = ({ username, password, description }: User, expectedTypes: string[]) => {
      it(`returns expected assignable types for ${description ?? username}`, async () => {
        await supertest
          .get(`/internal/saved_objects_tagging/assignments/_assignable_types`)
          .auth(username, password)
          .expect(200)
          .then(({ body }: { body: any }) => {
            expect(body.types).to.eql(expectedTypes);
          });
      });
    };

    const createTestSuite = () => {
      Object.entries(assignablePerUser).forEach(([username, expectedTypes]) => {
        const user = Object.values(USERS).find((usr) => usr.username === username)!;
        createUserTest(user, expectedTypes);
      });
    };

    createTestSuite();
  });
}
