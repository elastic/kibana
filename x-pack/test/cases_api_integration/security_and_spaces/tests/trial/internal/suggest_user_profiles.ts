/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { loginUsers, suggestUserProfiles } from '../../../../common/lib/user_profiles';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  superUser,
  obsOnly,
  noCasesPrivilegesSpace1,
} from '../../../../common/lib/authentication/users';
import { Role, User } from '../../../../common/lib/authentication/types';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('suggest_user_profiles', () => {
    it('returns no suggestions when the owner is an empty array', async () => {
      const profiles = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'delete',
          owners: [],
        },
        auth: { user: superUser, space: 'space1' },
      });

      expect(profiles.length).to.be(0);
    });

    it('finds the profile for the user without deletion privileges', async () => {
      const profiles = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'delete',
          owners: ['securitySolutionFixture'],
        },
        auth: { user: superUser, space: 'space1' },
      });

      expectSnapshot(profiles.map(({ user, data }) => ({ user, data }))).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "sec_only_no_delete@elastic.co",
              "full_name": "sec only_no_delete",
              "username": "sec_only_no_delete",
            },
          },
        ]
      `);
    });

    it('does not find a user who does not have access to the default space', async () => {
      const profiles = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'delete',
          owners: ['securitySolutionFixture'],
        },
        auth: { user: superUser, space: null },
      });

      expect(profiles).to.be.empty();
    });

    it('does not find a user who does not have access to the securitySolutionFixture owner', async () => {
      const profiles = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'only',
          owners: ['securitySolutionFixture'],
        },
        auth: { user: superUser, space: 'space1' },
      });

      // ensure that the returned profiles doesn't include the obsOnly user
      expect(profiles.filter(({ user }) => user.username === obsOnly.username)).to.be.empty();
      expectSnapshot(profiles.map(({ user, data }) => ({ user, data }))).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "sec_only_no_delete@elastic.co",
              "full_name": "sec only_no_delete",
              "username": "sec_only_no_delete",
            },
          },
          Object {
            "data": Object {},
            "user": Object {
              "email": "sec_only@elastic.co",
              "full_name": "sec only",
              "username": "sec_only",
            },
          },
        ]
      `);
    });

    it('does not find a user who does not have update privileges to cases', async () => {
      const profiles = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'read',
          owners: ['securitySolutionFixture'],
        },
        auth: { user: superUser, space: 'space1' },
      });

      expect(profiles).to.be.empty();
    });

    it('fails with a 403 because the user making the request does not have the appropriate api kibana endpoint privileges', async () => {
      await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'delete',
          owners: ['securitySolutionFixture'],
        },
        auth: { user: noCasesPrivilegesSpace1, space: 'space1' },
        expectedHttpCode: 403,
      });
    });

    it('returns no profiles for an owner that does not exist', async () => {
      const profiles = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'read',
          owners: ['invalidOwner'],
        },
        auth: { user: superUser, space: null },
      });

      expect(profiles).to.be.empty();
    });

    it('returns a 400 if size is greater than 100', async () => {
      await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'blah',
          owners: ['securitySolutionFixture'],
          size: 101,
        },
        auth: { user: superUser, space: 'space1' },
        expectedHttpCode: 400,
      });
    });

    it('returns a 400 if size is less than 0', async () => {
      await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'blah',
          owners: ['securitySolutionFixture'],
          size: -1,
        },
        auth: { user: superUser, space: 'space1' },
        expectedHttpCode: 400,
      });
    });

    it('limits the results to one, when the size is specified as one', async () => {
      const profiles = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'only',
          owners: ['securitySolutionFixture'],
          size: 1,
        },
        auth: { user: superUser, space: 'space1' },
      });

      expect(profiles.length).to.be(1);
      expectSnapshot(profiles.map(({ user, data }) => ({ user, data }))).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "sec_only_no_delete@elastic.co",
              "full_name": "sec only_no_delete",
              "username": "sec_only_no_delete",
            },
          },
        ]
      `);
    });

    describe('user with both security and observability privileges', () => {
      const obsAndSecRole: Role = {
        name: 'obsAndSecRole',
        privileges: {
          elasticsearch: {
            indices: [
              {
                names: ['*'],
                privileges: ['all'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                securitySolutionFixture: ['all'],
                observabilityFixture: ['all'],
                actions: ['all'],
                actionsSimulators: ['all'],
              },
              spaces: ['space1'],
            },
          ],
        },
      };

      const obsAndSecUser: User = {
        username: 'obs_and_sec_user',
        password: 'obs_and_sec_user',
        roles: [obsAndSecRole.name],
      };

      const users = [obsAndSecUser];
      const roles = [obsAndSecRole];

      before(async () => {
        await createUsersAndRoles(getService, users, roles);
        await loginUsers({
          supertest: supertestWithoutAuth,
          users,
        });
      });

      after(async () => {
        await deleteUsersAndRoles(getService, users, roles);
      });

      it('finds 3 profiles when searching for the name sec when a user has both security and observability privileges', async () => {
        const profiles = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            name: 'sec',
            owners: ['securitySolutionFixture'],
          },
          auth: { user: superUser, space: 'space1' },
        });

        expectSnapshot(profiles.map(({ user, data }) => ({ user, data }))).toMatchInline(`
          Array [
            Object {
              "data": Object {},
              "user": Object {
                "email": "sec_only_no_delete@elastic.co",
                "full_name": "sec only_no_delete",
                "username": "sec_only_no_delete",
              },
            },
            Object {
              "data": Object {},
              "user": Object {
                "email": "obs_and_sec_user@elastic.co",
                "full_name": "obs and_sec_user",
                "username": "obs_and_sec_user",
              },
            },
            Object {
              "data": Object {},
              "user": Object {
                "email": "sec_only@elastic.co",
                "full_name": "sec only",
                "username": "sec_only",
              },
            },
          ]
        `);
      });
    });

    const deletedUserRole: Role = {
      name: 'deleted_user_sec_all_role',
      privileges: {
        elasticsearch: {
          indices: [
            {
              names: ['*'],
              privileges: ['all'],
            },
          ],
        },
        kibana: [
          {
            feature: {
              securitySolutionFixture: ['all'],
              actions: ['all'],
              actionsSimulators: ['all'],
            },
            spaces: ['space1'],
          },
        ],
      },
    };

    const deletedUser: User = {
      username: 'deletedUserSecAll',
      password: 'deletedUserSecAll',
      roles: [deletedUserRole.name],
    };

    const users = [deletedUser];
    const roles = [deletedUserRole];

    describe('deleted user', () => {
      before(async () => {
        await createUsersAndRoles(getService, users, roles);
        await loginUsers({
          supertest: supertestWithoutAuth,
          users,
        });

        // don't delete the role
        await deleteUsersAndRoles(getService, users, []);
      });

      after(async () => {
        await deleteUsersAndRoles(getService, [], roles);
      });

      it('finds the profile for a user who was deleted', async () => {
        const profiles = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            name: 'deletedUserSecAll',
            owners: ['securitySolutionFixture'],
          },
          auth: { user: superUser, space: 'space1' },
        });

        expectSnapshot(profiles.map(({ user, data }) => ({ user, data }))).toMatchInline(`
          Array [
            Object {
              "data": Object {},
              "user": Object {
                "email": "deletedUserSecAll@elastic.co",
                "full_name": "deletedUserSecAll",
                "username": "deletedUserSecAll",
              },
            },
          ]
        `);
      });
    });

    describe('deleted user and role', () => {
      before(async () => {
        await createUsersAndRoles(getService, users, roles);
        await loginUsers({
          supertest: supertestWithoutAuth,
          users,
        });
        await deleteUsersAndRoles(getService, users, roles);
      });

      it('does not find the profile for a deleted user and role', async () => {
        const profiles = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: {
            name: 'deletedUserSecAll',
            owners: ['securitySolutionFixture'],
          },
          auth: { user: superUser, space: 'space1' },
        });

        expect(profiles).to.be.empty();
      });
    });
  });
}
