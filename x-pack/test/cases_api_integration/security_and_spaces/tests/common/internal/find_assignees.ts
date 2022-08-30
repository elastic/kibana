/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { findAssignees, suggestUserProfiles } from '../../../../common/lib/user_profiles';
import { createCase, deleteAllCaseItems } from '../../../../common/lib/utils';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { superUser } from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('find_assignees', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('returns a 400 if size is greater than 100', async () => {
      await findAssignees({
        supertest: supertestWithoutAuth,
        req: {
          searchTerm: 'blah',
          owners: ['securitySolutionFixture'],
          size: 101,
        },
        auth: { user: superUser, space: 'space1' },
        expectedHttpCode: 400,
      });
    });

    it('returns a 400 if size is less than 0', async () => {
      await findAssignees({
        supertest: supertestWithoutAuth,
        req: {
          searchTerm: 'blah',
          owners: ['securitySolutionFixture'],
          size: -1,
        },
        auth: { user: superUser, space: 'space1' },
        expectedHttpCode: 400,
      });
    });

    it('limits the results to one, when the size is specified as one', async () => {
      const suggestions = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'only',
          owners: ['securitySolutionFixture'],
          size: 2,
        },
        auth: { user: superUser, space: 'space1' },
      });

      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({
          assignees: [{ uid: suggestions[0].uid }, { uid: suggestions[1].uid }],
        }),
        200,
        { user: superUser, space: 'space1' }
      );

      const assignees = await findAssignees({
        supertest: supertestWithoutAuth,
        req: {
          searchTerm: 'only',
          owners: ['securitySolutionFixture'],
          size: 1,
        },
        auth: { user: superUser, space: 'space1' },
      });

      expect(assignees.length).to.be(1);
    });

    it('returns all the assignees when the search term is empty', async () => {
      const suggestions = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'only',
          owners: ['securitySolutionFixture'],
          size: 2,
        },
        auth: { user: superUser, space: 'space1' },
      });

      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({
          assignees: [{ uid: suggestions[0].uid }, { uid: suggestions[1].uid }],
        }),
        200,
        { user: superUser, space: 'space1' }
      );

      const assignees = await findAssignees({
        supertest: supertestWithoutAuth,
        req: {
          searchTerm: '',
          owners: ['securitySolutionFixture'],
        },
        auth: { user: superUser, space: 'space1' },
      });

      expect(assignees.length).to.be(2);
      expectSnapshot(assignees.map(({ user, data }) => ({ user, data }))).toMatchInline(`
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

    it('returns one assignee of the two when the search term is empty and size is specified', async () => {
      const suggestions = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'only',
          owners: ['securitySolutionFixture'],
          size: 2,
        },
        auth: { user: superUser, space: 'space1' },
      });

      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({
          assignees: [{ uid: suggestions[0].uid }, { uid: suggestions[1].uid }],
        }),
        200,
        { user: superUser, space: 'space1' }
      );

      const assignees = await findAssignees({
        supertest: supertestWithoutAuth,
        req: {
          searchTerm: '',
          owners: ['securitySolutionFixture'],
          size: 1,
        },
        auth: { user: superUser, space: 'space1' },
      });

      expect(assignees.length).to.be(1);
      expectSnapshot(assignees.map(({ user, data }) => ({ user, data }))).toMatchInline(`
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

    it('ignores suggestions that are not assigned to a case', async () => {
      const suggestions = await suggestUserProfiles({
        supertest: supertestWithoutAuth,
        req: {
          name: 'only',
          owners: ['securitySolutionFixture'],
          size: 2,
        },
        auth: { user: superUser, space: 'space1' },
      });

      await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({
          assignees: [{ uid: suggestions[0].uid }],
        }),
        200,
        { user: superUser, space: 'space1' }
      );

      const assignees = await findAssignees({
        supertest: supertestWithoutAuth,
        req: {
          searchTerm: 'only',
          owners: ['securitySolutionFixture'],
        },
        auth: { user: superUser, space: 'space1' },
      });

      expect(assignees.length).to.be(1);
      expectSnapshot(assignees.map(({ user, data }) => ({ user, data }))).toMatchInline(`
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
  });
}
