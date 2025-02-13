/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import expect from '@kbn/expect';
import { BulkCreateCasesResponse } from '@kbn/cases-plugin/common/types/api';
import { CaseSeverity } from '@kbn/cases-plugin/common';
import { CaseStatuses, CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';
import { User } from '../../../../common/lib/authentication/types';
import { defaultUser, getPostCaseRequest, postCaseResp } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  findCaseUserActions,
  getSpaceUrlPrefix,
  removeServerGeneratedPropertiesFromCase,
  removeServerGeneratedPropertiesFromUserAction,
} from '../../../../common/lib/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  secOnly,
  secOnlyRead,
  globalRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
  testDisabled,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const es = getService('es');

  /**
   * There is no official route that supports
   * bulk creating cases. The purpose of this test
   * is to test the bulkCreate method of the cases client in
   * x-pack/platform/plugins/shared/cases/server/client/cases/bulk_create.ts
   *
   * The test route is configured here x-pack/test/cases_api_integration/common/plugins/cases/server/routes.ts
   */
  describe('bulk_create_cases', () => {
    const bulkCreateCases = async ({
      superTestService = supertest,
      data,
      expectedHttpCode = 200,
      auth = { user: superUser, space: null },
    }: {
      superTestService?: SuperTest.Agent;
      data: object;
      expectedHttpCode?: number;
      auth?: { user: User; space: string | null };
    }): Promise<BulkCreateCasesResponse> => {
      return superTestService
        .post(`${getSpaceUrlPrefix(auth?.space)}/api/cases_fixture/cases:bulkCreate`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .auth(auth.user.username, auth.user.password)
        .send(data)
        .expect(expectedHttpCode)
        .then((response) => response.body);
    };

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should bulk create cases', async () => {
      const createdCases = await bulkCreateCases({
        data: {
          cases: [getPostCaseRequest(), getPostCaseRequest({ severity: CaseSeverity.MEDIUM })],
        },
      });

      expect(createdCases.cases.length === 2);

      const firstCase = removeServerGeneratedPropertiesFromCase(createdCases.cases[0]);
      const secondCase = removeServerGeneratedPropertiesFromCase(createdCases.cases[1]);

      expect(firstCase).to.eql(postCaseResp(null, getPostCaseRequest()));
      expect(secondCase).to.eql(
        postCaseResp(null, getPostCaseRequest({ severity: CaseSeverity.MEDIUM }))
      );
    });

    it('should bulk create cases with different owners', async () => {
      const createdCases = await bulkCreateCases({
        data: {
          cases: [getPostCaseRequest(), getPostCaseRequest({ owner: 'observabilityFixture' })],
        },
      });

      expect(createdCases.cases.length === 2);

      const firstCase = removeServerGeneratedPropertiesFromCase(createdCases.cases[0]);
      const secondCase = removeServerGeneratedPropertiesFromCase(createdCases.cases[1]);

      expect(firstCase).to.eql(postCaseResp(null, getPostCaseRequest()));
      expect(secondCase).to.eql(
        postCaseResp(null, getPostCaseRequest({ owner: 'observabilityFixture' }))
      );
    });

    it('should allow creating a case with custom ID', async () => {
      const createdCases = await bulkCreateCases({
        data: {
          cases: [{ id: 'test-case', ...getPostCaseRequest() }],
        },
      });

      expect(createdCases.cases.length === 1);

      const firstCase = createdCases.cases[0];

      expect(firstCase.id).to.eql('test-case');
    });

    it('should validate custom fields correctly', async () => {
      await bulkCreateCases({
        data: {
          cases: [
            getPostCaseRequest({
              customFields: [
                {
                  key: 'duplicated_key',
                  type: CustomFieldTypes.TEXT,
                  value: 'this is a text field value',
                },
                {
                  key: 'duplicated_key',
                  type: CustomFieldTypes.TEXT,
                  value: 'this is a text field value',
                },
              ],
            }),
          ],
        },
        expectedHttpCode: 400,
      });
    });

    it('should throw an error correctly', async () => {
      await bulkCreateCases({
        data: {
          cases: [
            // two cases with the same ID will result to a conflict error
            { id: 'test-case', ...getPostCaseRequest() },
            { id: 'test-case', ...getPostCaseRequest() },
          ],
        },
        expectedHttpCode: 409,
      });
    });

    it('should create user actions correctly', async () => {
      const createdCases = await bulkCreateCases({
        data: {
          cases: [getPostCaseRequest(), getPostCaseRequest({ severity: CaseSeverity.MEDIUM })],
        },
      });

      const firstCase = createdCases.cases[0];
      const secondCase = createdCases.cases[1];

      const { userActions: firstCaseUserActions } = await findCaseUserActions({
        supertest,
        caseID: firstCase.id,
      });

      const { userActions: secondCaseUserActions } = await findCaseUserActions({
        supertest,
        caseID: secondCase.id,
      });

      expect(firstCaseUserActions.length).to.eql(1);
      expect(secondCaseUserActions.length).to.eql(1);

      const firstCaseCreationUserAction = removeServerGeneratedPropertiesFromUserAction(
        firstCaseUserActions[0]
      );

      const secondCaseCreationUserAction = removeServerGeneratedPropertiesFromUserAction(
        secondCaseUserActions[0]
      );

      expect(firstCaseCreationUserAction).to.eql({
        action: 'create',
        type: 'create_case',
        created_by: defaultUser,
        comment_id: null,
        owner: 'securitySolutionFixture',
        payload: {
          description: firstCase.description,
          title: firstCase.title,
          tags: firstCase.tags,
          connector: firstCase.connector,
          settings: firstCase.settings,
          owner: firstCase.owner,
          status: CaseStatuses.open,
          severity: CaseSeverity.LOW,
          assignees: [],
          category: null,
          customFields: [],
        },
      });

      expect(secondCaseCreationUserAction).to.eql({
        action: 'create',
        type: 'create_case',
        created_by: defaultUser,
        comment_id: null,
        owner: 'securitySolutionFixture',
        payload: {
          description: secondCase.description,
          title: secondCase.title,
          tags: secondCase.tags,
          connector: secondCase.connector,
          settings: secondCase.settings,
          owner: secondCase.owner,
          status: CaseStatuses.open,
          severity: CaseSeverity.MEDIUM,
          assignees: [],
          category: null,
          customFields: [],
        },
      });
    });

    describe('rbac', () => {
      it('returns a 403 when attempting to create a case with an owner that was from a disabled feature in the space', async () => {
        const theCase = (await bulkCreateCases({
          superTestService: supertestWithoutAuth,
          data: { cases: [getPostCaseRequest({ owner: 'testDisabledFixture' })] },
          expectedHttpCode: 403,
          auth: {
            user: testDisabled,
            space: 'space1',
          },
        })) as unknown as { message: string };

        expect(theCase.message).to.eql(
          'Failed to bulk create cases: Error: Unauthorized to create case with owners: "testDisabledFixture"'
        );
      });

      it('User: security solution only - should create a case', async () => {
        const cases = await bulkCreateCases({
          superTestService: supertestWithoutAuth,
          data: { cases: [getPostCaseRequest({ owner: 'securitySolutionFixture' })] },
          expectedHttpCode: 200,
          auth: {
            user: secOnly,
            space: 'space1',
          },
        });

        expect(cases.cases[0].owner).to.eql('securitySolutionFixture');
      });

      it('User: security solution only - should NOT create a case of different owner', async () => {
        await bulkCreateCases({
          superTestService: supertestWithoutAuth,
          data: { cases: [getPostCaseRequest({ owner: 'observabilityFixture' })] },
          expectedHttpCode: 403,
          auth: {
            user: secOnly,
            space: 'space1',
          },
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT create a case`, async () => {
          await bulkCreateCases({
            superTestService: supertestWithoutAuth,
            data: { cases: [getPostCaseRequest({ owner: 'securitySolutionFixture' })] },
            expectedHttpCode: 403,
            auth: {
              user,
              space: 'space1',
            },
          });
        });
      }

      it('should NOT create a case in a space with no permissions', async () => {
        await bulkCreateCases({
          superTestService: supertestWithoutAuth,
          data: { cases: [getPostCaseRequest({ owner: 'securitySolutionFixture' })] },
          expectedHttpCode: 403,
          auth: {
            user: secOnly,
            space: 'space2',
          },
        });
      });
    });
  });
};
