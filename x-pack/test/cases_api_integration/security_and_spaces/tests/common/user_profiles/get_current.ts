/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { loginUsers, suggestUserProfiles } from '../../../../common/lib/user_profiles';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { superUser } from '../../../../common/lib/authentication/users';
import { createCase, deleteAllCaseItems } from '../../../../common/lib/utils';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { getUserInfo } from '../../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const security = getService('security');

  describe('user_profiles', () => {
    describe('get_current', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('sets the profile uid for a case', async () => {
        const superUserInfo = getUserInfo(superUser);

        // ensure the user's information is what we expect
        await security.user.create(superUser.username, {
          password: superUser.password,
          roles: superUser.roles,
          full_name: superUserInfo.full_name,
          email: superUserInfo.email,
        });

        const cookies = await loginUsers({ supertest: supertestWithoutAuth, users: [superUser] });

        const profiles = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            name: 'superUser',
            owners: ['securitySolutionFixture'],
            size: 1,
          },
          auth: { user: superUser, space: null },
        });

        const caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, null, {
          Cookie: cookies[0].cookieString(),
        });

        expect(caseInfo.created_by).to.eql({
          ...getUserInfo(superUser),
          profile_uid: profiles[0].uid,
        });
      });

      it('falls back to authc to get the user information when the profile is not available', async () => {
        const caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
          user: superUser,
          space: null,
        });

        expect(caseInfo.created_by).to.eql(getUserInfo(superUser));
      });
    });
  });
}
