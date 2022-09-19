/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { findCasesResp, getPostCaseRequest } from '../../../../common/lib/mock';
import { findCases, createCase, deleteAllCaseItems } from '../../../../common/lib/utils';
import { secOnlySpacesAll, superUser } from '../../../../common/lib/authentication/users';
import { suggestUserProfiles, loginUsers } from '../../../../common/lib/user_profiles';
import { getUserInfo } from '../../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('find_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('filters by reporters using the profile uid', async () => {
      const secOnlyInfo = getUserInfo(secOnlySpacesAll);

      const cookies = await loginUsers({
        supertest: supertestWithoutAuth,
        users: [superUser, secOnlySpacesAll],
      });

      const superUserHeaders = {
        Cookie: cookies[0].cookieString(),
      };

      const secOnlyHeaders = {
        Cookie: cookies[1].cookieString(),
      };

      const [, secCase, suggestedSecUsers] = await Promise.all([
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
        // get the profile of the security user
        suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            name: secOnlyInfo.username,
            owners: ['securitySolutionFixture'],
            size: 1,
          },
          auth: { user: superUser, space: 'space1' },
        }),
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
