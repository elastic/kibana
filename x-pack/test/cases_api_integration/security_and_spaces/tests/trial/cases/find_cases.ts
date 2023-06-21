/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Cookie } from 'tough-cookie';
import { User } from '@kbn/cases-plugin/common/api';
import { UserProfile } from '@kbn/security-plugin/common';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { findCasesResp, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  findCases,
  createCase,
  deleteAllCaseItems,
  suggestUserProfiles,
  loginUsers,
} from '../../../../common/lib/api';
import { secOnlySpacesAll, superUser } from '../../../../common/lib/authentication/users';
import { getUserInfo } from '../../../../common/lib/authentication';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';
import { securitySolutionOnlyAllSpacesRole } from '../../../../common/lib/authentication/roles';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('find_cases', () => {
    const secOnlyInfo: User = getUserInfo(secOnlySpacesAll);
    let cookies: Cookie[];
    let suggestedSecUsers: UserProfile[];
    let superUserHeaders: { Cookie: string };
    let secOnlyHeaders: { Cookie: string };

    before(async () => {
      await createUsersAndRoles(
        getService,
        [secOnlySpacesAll],
        [securitySolutionOnlyAllSpacesRole]
      );
    });

    beforeEach(async () => {
      cookies = await loginUsers({
        supertest: supertestWithoutAuth,
        users: [superUser, secOnlySpacesAll],
      });

      superUserHeaders = {
        Cookie: cookies[0].cookieString(),
      };

      secOnlyHeaders = {
        Cookie: cookies[1].cookieString(),
      };

      suggestedSecUsers = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: secOnlyInfo.username!,
          owners: ['securitySolutionFixture'],
          size: 1,
        },
        auth: { user: superUser, space: 'space1' },
      });
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    after(async () => {
      await deleteUsersAndRoles(
        getService,
        [secOnlySpacesAll],
        [securitySolutionOnlyAllSpacesRole]
      );
    });

    it('filters by reporters using the profile uid and username', async () => {
      // create a case with super user
      const superUserCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        200,
        { user: superUser, space: null }
      );

      // create a case with a security user
      const secOnlyCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        200,
        null,
        secOnlyHeaders
      );

      // find cases for both users
      const cases = await findCases({
        supertest,
        query: { reporters: [suggestedSecUsers[0].uid, superUser.username!] },
      });

      expect(cases).to.eql({
        ...findCasesResp,
        total: 2,
        // should only find the case created by the security user
        cases: [superUserCase, secOnlyCase],
        count_open_cases: 2,
      });
    });

    it('filters by reporters using the profile uid', async () => {
      const [, secCase] = await Promise.all([
        // create a case with super user
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          null,
          superUserHeaders
        ),
        // create a case with a security user
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          null,
          secOnlyHeaders
        ),
      ]);

      // find all cases for only the security user
      const cases = await findCases({
        supertest,
        query: { reporters: suggestedSecUsers[0].uid },
      });

      expect(cases).to.eql({
        ...findCasesResp,
        total: 1,
        // should only find the case created by the security user
        cases: [secCase],
        count_open_cases: 1,
      });
    });
  });
};
