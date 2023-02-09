/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Cookie } from 'tough-cookie';
import { UserProfile } from '@kbn/security-plugin/common';
import { securitySolutionOnlyAllSpacesRole } from '../../../../common/lib/authentication/roles';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  getCase,
  updateCase,
  getCaseUsers,
  loginUsers,
  bulkGetUserProfiles,
} from '../../../../common/lib/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';
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
  const kibanaServer = getService('kibanaServer');

  describe('user_actions_get_users', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('no profiles', () => {
      it('returns the users correctly without profile ids', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await changeCaseTitle({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          title: 'new title',
        });

        const { participants, assignees, unassignedUsers } = await getCaseUsers({
          caseId: postedCase.id,
          supertest,
        });

        expect(participants).to.eql([{ username: 'elastic', full_name: null, email: null }]);
        expect(assignees).to.eql([]);
        expect(unassignedUsers).to.eql([]);
      });
    });

    describe('no users', () => {
      before(async () => {
        /** The following dataset contains:
         *  a) A case without all properties of the created_by set to null
         *  and an assignee with no valid uid
         *  b) A user action that removes an assignee that does not exists
         */
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.5.0/cases_no_users.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.5.0/cases_no_users.json'
        );
      });

      it('returns users without information', async () => {
        const theCase = await getCase({
          supertest,
          caseId: '163d5820-1284-21ed-81af-63a2bdfb2bf9',
        });

        const { participants, assignees, unassignedUsers } = await getCaseUsers({
          caseId: theCase.id,
          supertest,
        });

        expect(participants).to.eql([{ username: null, full_name: null, email: null }]);
        expect(assignees).to.eql([{ profile_uid: 'abc' }]);
        expect(unassignedUsers).to.eql([{ profile_uid: 'dfg' }]);
      });
    });

    describe('profiles', () => {
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

        /**
         * We cannot call suggestUserProfiles on basic license.
         * To get the profiles of the users we create a case and
         * then we extract the profile ids from created_by.profile_uid
         */
        const [superUserCase, secUserCase] = await Promise.all([
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, null, superUserHeaders),
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, null, secOnlyHeaders),
        ]);

        const userProfiles = await bulkGetUserProfiles({
          supertest,
          // @ts-expect-error: profile uids are defined for both users
          req: { uids: [superUserCase.created_by.profile_uid, secUserCase.created_by.profile_uid] },
        });

        superUserProfile = userProfiles[0];
        secUserProfile = userProfiles[1];
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

        const { participants, assignees, unassignedUsers } = await getCaseUsers({
          caseId: postedCase.id,
          supertest,
        });

        expect(participants).to.eql([
          {
            username: superUserProfile.user.username,
            full_name: superUserProfile.user.full_name,
            email: superUserProfile.user.email,
            profile_uid: superUserProfile.uid,
          },
        ]);

        expect(assignees).to.eql([]);
        expect(unassignedUsers).to.eql([]);
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

        const { participants, assignees, unassignedUsers } = await getCaseUsers({
          caseId: postedCase.id,
          supertest,
        });

        expect(participants).to.eql([
          {
            username: superUserProfile.user.username,
            full_name: superUserProfile.user.full_name,
            email: superUserProfile.user.email,
            profile_uid: superUserProfile.uid,
          },
        ]);

        expect(assignees).to.eql([]);
        expect(unassignedUsers).to.eql([]);
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

        const { participants, assignees, unassignedUsers } = await getCaseUsers({
          caseId: postedCase.id,
          supertest,
        });

        expect(participants).to.eql([
          {
            username: secUserProfile.user.username,
            full_name: secUserProfile.user.full_name,
            email: secUserProfile.user.email,
            profile_uid: secUserProfile.uid,
          },
          {
            username: superUserProfile.user.username,
            full_name: superUserProfile.user.full_name,
            email: superUserProfile.user.email,
            profile_uid: superUserProfile.uid,
          },
        ]);

        expect(assignees).to.eql([]);
        expect(unassignedUsers).to.eql([]);
      });

      it('does not return duplicate participants', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          null,
          superUserHeaders
        );

        const updatedCases = await changeCaseTitle({
          supertest,
          caseId: postedCase.id,
          version: postedCase.version,
          title: 'new title',
          headers: secOnlyHeaders,
        });

        await changeCaseDescription({
          supertest,
          caseId: updatedCases[0].id,
          version: updatedCases[0].version,
          description: 'new desc',
          headers: secOnlyHeaders,
        });

        const { participants, assignees, unassignedUsers } = await getCaseUsers({
          caseId: postedCase.id,
          supertest,
        });

        expect(participants).to.eql([
          {
            username: secUserProfile.user.username,
            full_name: secUserProfile.user.full_name,
            email: secUserProfile.user.email,
            profile_uid: secUserProfile.uid,
          },
          {
            username: superUserProfile.user.username,
            full_name: superUserProfile.user.full_name,
            email: superUserProfile.user.email,
            profile_uid: superUserProfile.uid,
          },
        ]);

        expect(assignees).to.eql([]);
        expect(unassignedUsers).to.eql([]);
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

const changeCaseDescription = async ({
  supertest,
  caseId,
  version,
  description,
  expectedHttpCode,
  auth,
  headers,
}: UserActionParams<{ description: string }>) =>
  updateCase({
    supertest,
    params: {
      cases: [
        {
          id: caseId,
          version,
          description,
        },
      ],
    },
    expectedHttpCode,
    auth,
    headers,
  });
