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
import { securitySolutionOnlyAllSpacesRole } from '../../../../common/lib/authentication/roles';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, deleteAllCaseItems, updateCase } from '../../../../common/lib/utils';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getCaseUsers } from '../../../../common/lib/user_actions';
import { suggestUserProfiles, loginUsers } from '../../../../common/lib/user_profiles';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
  getUserInfo,
} from '../../../../common/lib/authentication';
import {
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  secOnlySpacesAll,
  superUser,
  noKibanaPrivileges,
  globalRead,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('user_actions_get_users', () => {
    describe('no profiles', () => {
      it('returns the users correctly without profile ids', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await changeCaseTitle({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          title: 'new title',
        });

        const { users } = await getCaseUsers({ caseId: postedCase.id, supertest });
        expect(users).to.eql([
          { user: { username: 'elastic', full_name: null, email: null }, type: 'participant' },
        ]);
      });
    });

    describe('profiles', () => {
      const secOnlyInfo: User = getUserInfo(secOnlySpacesAll);
      let cookies: Cookie[];
      let secUserProfile: UserProfile;
      let superUserProfile: UserProfile;
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

        const suggestedSecUsers = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            name: secOnlyInfo.username!,
            owners: ['securitySolutionFixture'],
            size: 1,
          },
          auth: { user: superUser, space: 'space1' },
        });

        secUserProfile = suggestedSecUsers[0];

        const suggestedSuperUser = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            name: 'superUser',
            owners: ['securitySolutionFixture'],
            size: 1,
          },
          auth: { user: superUser, space: null },
        });

        superUserProfile = suggestedSuperUser[0];
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

      it('returns only the creator of the case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        const { users } = await getCaseUsers({ caseId: postedCase.id, supertest });

        expect(users).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
              profile_uid: superUserProfile.uid,
            },
            type: 'participant',
          },
        ]);
      });

      it('returns one participant if it is the only one that participates to the case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        await changeCaseTitle({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          title: 'new title',
          headers: superUserHeaders,
        });

        const { users } = await getCaseUsers({ caseId: postedCase.id, supertest });

        expect(users).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
              profile_uid: superUserProfile.uid,
            },
            type: 'participant',
          },
        ]);
      });

      it('returns all participants of the case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        await changeCaseTitle({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          title: 'new title',
          headers: secOnlyHeaders,
        });

        const { users } = await getCaseUsers({ caseId: postedCase.id, supertest });

        expect(users).to.eql([
          {
            user: {
              username: secUserProfile.user.username,
              full_name: secUserProfile.user.full_name,
              email: secUserProfile.user.email,
              profile_uid: secUserProfile.uid,
            },
            type: 'participant',
          },
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
              profile_uid: superUserProfile.uid,
            },
            type: 'participant',
          },
        ]);
      });

      it('returns participants and users correctly when assigning users to a case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        // assignee superUser and secUserProfile
        await setAssignees({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          assignees: [{ uid: superUserProfile.uid }, { uid: secUserProfile.uid }],
          headers: superUserHeaders,
        });

        const { users } = await getCaseUsers({ caseId: postedCase.id, supertest });

        expect(users).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
              profile_uid: superUserProfile.uid,
            },
            type: 'participant',
          },
          {
            user: {
              username: secUserProfile.user.username,
              full_name: secUserProfile.user.full_name,
              email: secUserProfile.user.email,
              profile_uid: secUserProfile.uid,
            },
            type: 'user',
          },
        ]);
      });

      it('returns participants and users correctly when de-assigning users to a case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        // assignee superUser and secUserProfile
        const updatedCase = await setAssignees({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          assignees: [{ uid: superUserProfile.uid }, { uid: secUserProfile.uid }],
          headers: superUserHeaders,
        });

        // de-assignee secUser
        await setAssignees({
          supertest,
          caseId: updatedCase[0].id,
          version: updatedCase[0].version,
          assignees: [{ uid: superUserProfile.uid }],
          headers: superUserHeaders,
        });

        const { users } = await getCaseUsers({ caseId: postedCase.id, supertest });

        expect(users).to.eql([
          {
            user: {
              username: superUserProfile.user.username,
              full_name: superUserProfile.user.full_name,
              email: superUserProfile.user.email,
              profile_uid: superUserProfile.uid,
            },
            type: 'participant',
          },
          {
            user: {
              username: secUserProfile.user.username,
              full_name: secUserProfile.user.full_name,
              email: secUserProfile.user.email,
              profile_uid: secUserProfile.uid,
            },
            type: 'user',
          },
        ]);
      });
    });

    describe('rbac', () => {
      it('should retrieve the users for a case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          await getCaseUsers({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not get the users for a case when the user does not have access to the owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
          await getCaseUsers({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            expectedHttpCode: 403,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not get a case in a space the user does not have permissions to', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        await getCaseUsers({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          expectedHttpCode: 403,
          auth: { user: secOnly, space: 'space2' },
        });
      });
    });
  });
};

type UserActionParams<T> = Omit<Parameters<typeof updateCase>[0], 'params'> & {
  caseId: string;
  version: string;
} & T;

const changeCaseTitle = async ({
  supertest,
  caseId,
  version,
  title,
  expectedHttpCode,
  auth,
  headers,
}: UserActionParams<{ title: string }>) =>
  updateCase({
    supertest,
    params: {
      cases: [
        {
          id: caseId,
          version,
          title,
        },
      ],
    },
    expectedHttpCode,
    auth,
    headers,
  });

const setAssignees = async ({
  supertest,
  caseId,
  version,
  assignees,
  expectedHttpCode,
  auth,
  headers,
}: UserActionParams<{ assignees: Array<{ uid: string }> }>) =>
  updateCase({
    supertest,
    params: {
      cases: [
        {
          id: caseId,
          version,
          assignees,
        },
      ],
    },
    expectedHttpCode,
    auth,
    headers,
  });
