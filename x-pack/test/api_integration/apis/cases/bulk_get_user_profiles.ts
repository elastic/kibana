/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APP_ID as CASES_APP_ID } from '@kbn/cases-plugin/common/constants';
import { APP_ID as SECURITY_SOLUTION_APP_ID } from '@kbn/security-solution-plugin/common/constants';
import { observabilityFeatureId as OBSERVABILITY_APP_ID } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

import { deleteAllCaseItems } from '../../../cases_api_integration/common/lib/api';
import {
  bulkGetUserProfiles,
  suggestUserProfiles,
} from '../../../cases_api_integration/common/lib/api/user_profiles';
import {
  casesAllUser,
  casesReadUser,
  obsCasesAllUser,
  obsCasesReadUser,
  secAllCasesNoneUser,
  secAllUser,
  secReadCasesReadUser,
} from './common/users';

export default ({ getService }: FtrProviderContext): void => {
  describe('bulk_get_user_profiles', () => {
    const es = getService('es');
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const { user, owner } of [
      { user: secAllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesAllUser, owner: CASES_APP_ID },
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with roles(s) ${user.roles.join()} can bulk get valid user profiles`, async () => {
        const suggestedProfiles = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: { name: user.username, owners: [owner], size: 1 },
          auth: { user, space: null },
        });

        const profiles = await bulkGetUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            uids: suggestedProfiles.map((suggestedProfile) => suggestedProfile.uid),
            dataPath: 'avatar',
          },
          auth: { user, space: null },
        });

        expect(profiles.length).to.be(1);
        expect(profiles[0].user.username).to.eql(user.username);
      });
    }

    for (const { user } of [
      { user: secReadCasesReadUser },
      { user: casesReadUser },
      { user: obsCasesReadUser },
    ]) {
      it(`User ${
        user.username
      } with roles(s) ${user.roles.join()} can bulk get user profiles`, async () => {
        await bulkGetUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            uids: ['1'],
            dataPath: 'avatar',
          },
          auth: { user, space: null },
        });
      });
    }

    for (const { user } of [{ user: secAllCasesNoneUser }]) {
      it(`User ${
        user.username
      } with roles(s) ${user.roles.join()} cannot bulk get user profiles because they lack the bulkGetUserProfiles privilege`, async () => {
        await bulkGetUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            uids: ['1'],
            dataPath: 'avatar',
          },
          auth: { user, space: null },
          expectedHttpCode: 403,
        });
      });
    }
  });
};
