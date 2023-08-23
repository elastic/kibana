/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APP_ID as CASES_APP_ID, MAX_SUGGESTED_PROFILES } from '@kbn/cases-plugin/common/constants';
import { APP_ID as SECURITY_SOLUTION_APP_ID } from '@kbn/security-solution-plugin/common/constants';
import { observabilityFeatureId as OBSERVABILITY_APP_ID } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

import { deleteAllCaseItems } from '../../../cases_api_integration/common/lib/api';
import { suggestUserProfiles } from '../../../cases_api_integration/common/lib/api/user_profiles';
import {
  casesAllUser,
  casesOnlyDeleteUser,
  casesReadUser,
  obsCasesAllUser,
  obsCasesOnlyDeleteUser,
  obsCasesReadUser,
  secAllCasesNoneUser,
  secAllCasesReadUser,
  secAllUser,
} from './common/users';

export default ({ getService }: FtrProviderContext): void => {
  describe('suggest_user_profiles', () => {
    const es = getService('es');
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const { user, searchTerm, owner } of [
      { user: secAllUser, searchTerm: secAllUser.username, owner: SECURITY_SOLUTION_APP_ID },
      {
        user: secAllCasesReadUser,
        searchTerm: secAllUser.username,
        owner: SECURITY_SOLUTION_APP_ID,
      },
      { user: casesAllUser, searchTerm: casesAllUser.username, owner: CASES_APP_ID },
      { user: casesReadUser, searchTerm: casesAllUser.username, owner: CASES_APP_ID },
      { user: obsCasesAllUser, searchTerm: obsCasesAllUser.username, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesReadUser, searchTerm: obsCasesAllUser.username, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with roles(s) ${user.roles.join()} can retrieve user profile suggestions`, async () => {
        const profiles = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: { name: searchTerm, owners: [owner], size: 1 },
          auth: { user, space: null },
        });

        expect(profiles.length).to.be(1);
        expect(profiles[0].user.username).to.eql(searchTerm);
      });
    }

    for (const { user, owner } of [
      { user: secAllCasesNoneUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesOnlyDeleteUser, owner: CASES_APP_ID },
      { user: obsCasesOnlyDeleteUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot retrieve user profile suggestions because they lack privileges`, async () => {
        await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: { name: user.username, owners: [owner] },
          auth: { user, space: null },
          expectedHttpCode: 403,
        });
      });
    }

    describe('errors', () => {
      it('400s when size parameter is not valid', async () => {
        await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            name: casesAllUser.username,
            owners: [CASES_APP_ID],
            size: MAX_SUGGESTED_PROFILES + 1,
          },
          auth: { user: casesAllUser, space: null },
          expectedHttpCode: 400,
        });
      });
    });
  });
};
