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

import { createCase, deleteAllCaseItems } from '../../../cases_api_integration/common/lib/utils';
import { getPostCaseRequest } from '../../../cases_api_integration/common/lib/mock';
import {
  findAssignees,
  suggestUserProfiles,
} from '../../../cases_api_integration/common/lib/user_profiles';
import {
  casesAllUser,
  casesOnlyDeleteUser,
  casesReadUser,
  obsCasesAllUser,
  obsCasesOnlyDeleteUser,
  obsCasesReadUser,
  secAllCasesReadUser,
  secAllUser,
} from './common/users';

export default ({ getService }: FtrProviderContext): void => {
  describe('find_assignees', () => {
    const es = getService('es');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const supertest = getService('supertest');

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
      } with roles(s) ${user.roles.join()} can retrieve assignees`, async () => {
        const profiles = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: { name: user.username, owners: [owner], size: 1 },
          auth: { user, space: null },
        });

        await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner, assignees: [{ uid: profiles[0].uid }] }),
          200,
          {
            user,
            space: null,
          }
        );

        const assignees = await findAssignees({
          supertest: supertestWithoutAuth,
          req: { searchTerm: user.username, owners: [owner], size: 1 },
          auth: { user, space: null },
        });

        expect(assignees.length).to.be(1);
        expect(assignees[0].user.username).to.eql(user.username);
      });
    }

    // these users do not have access to the _suggest_user_profiles api so they can't be included in the tests above
    // but they should not receive a 403 like the tests below
    for (const { user, owner } of [
      { user: secAllCasesReadUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesReadUser, owner: CASES_APP_ID },
      { user: obsCasesReadUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} can make requests to _find_assignees`, async () => {
        const profiles = await suggestUserProfiles({
          supertest,
          req: {
            name: '',
            owners: [owner],
            size: 1,
          },
        });

        await createCase(
          supertest,
          getPostCaseRequest({ owner, assignees: [{ uid: profiles[0].uid }] }),
          200
        );

        const assignees = await findAssignees({
          supertest: supertestWithoutAuth,
          req: { searchTerm: '', owners: [owner] },
          auth: { user, space: null },
        });

        expect(assignees.length).to.be(1);
        expect(assignees[0].user.username).to.eql(profiles[0].user.username);
      });
    }

    for (const { user, owner } of [
      { user: casesOnlyDeleteUser, owner: CASES_APP_ID },
      { user: obsCasesOnlyDeleteUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot retrieve assignees because they lack privileges`, async () => {
        await findAssignees({
          supertest: supertestWithoutAuth,
          req: { searchTerm: user.username, owners: [owner] },
          auth: { user, space: null },
          expectedHttpCode: 403,
        });
      });
    }
  });
};
