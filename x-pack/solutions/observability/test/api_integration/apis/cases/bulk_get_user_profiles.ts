/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { observabilityFeatureId as OBSERVABILITY_APP_ID } from '@kbn/observability-plugin/common';

import { deleteAllCaseItems } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/api';
import {
  bulkGetUserProfiles,
  suggestUserProfiles,
} from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/api/user_profiles';
import { obsCasesAllUser } from '@kbn/test-suites-xpack-platform/api_integration/apis/cases/common/users';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  describe('bulk_get_user_profiles', () => {
    const es = getService('es');
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const { user, owner } of [{ user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID }]) {
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
  });
};
