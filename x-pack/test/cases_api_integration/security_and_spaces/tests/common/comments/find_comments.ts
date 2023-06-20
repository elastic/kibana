/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import { CommentType } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  getPostCaseRequest,
  persistableStateAttachment,
  postCaseReq,
  postCommentActionsReq,
  postCommentAlertReq,
  postCommentUserReq,
  postExternalReferenceESReq,
} from '../../../../common/lib/mock';
import {
  createComment,
  deleteAllCaseItems,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  ensureSavedObjectIsAuthorized,
  getSpaceUrlPrefix,
  createCase,
  findAttachments,
  bulkCreateAttachments,
} from '../../../../common/lib/api';

import {
  obsOnly,
  secOnly,
  obsOnlyRead,
  secOnlyRead,
  noKibanaPrivileges,
  superUser,
  globalRead,
  obsSecRead,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_comments', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should find all case comment', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200);

      // post 2 comments
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
        expectedHttpCode: 200,
      });

      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
        expectedHttpCode: 200,
      });

      const caseComments = await findAttachments({
        supertest,
        caseId: postedCase.id,
        expectedHttpCode: 200,
      });

      expect(caseComments.comments).to.eql(patchedCase.comments);
    });

    it('should find only case comments of the correct type', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200);

      // post 5 comments of all possible types
      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          postCommentUserReq,
          postCommentAlertReq,
          postCommentActionsReq,
          postExternalReferenceESReq,
          persistableStateAttachment,
        ],
        expectedHttpCode: 200,
      });

      const caseComments = await findAttachments({
        supertest,
        caseId: postedCase.id,
        expectedHttpCode: 200,
      });

      expect(caseComments.comments.length).to.eql(1);
      expect(caseComments.comments[0].type).to.eql(CommentType.user);
    });

    describe('unhappy paths', () => {
      for (const errorScenario of [
        { name: 'field is wrong type', queryParams: { perPage: true } },
        { name: 'field is unknown', queryParams: { foo: 'bar' } },
        { name: 'page > 10k', queryParams: { page: 10001 } },
        { name: 'perPage > 10k', queryParams: { perPage: 10001 } },
        { name: 'page * perPage > 10k', queryParams: { page: 2, perPage: 9001 } },
      ]) {
        it(`400s when ${errorScenario.name}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq, 200);

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: postCommentUserReq,
            expectedHttpCode: 200,
          });

          await findAttachments({
            supertest,
            caseId: postedCase.id,
            query: errorScenario.queryParams,
            expectedHttpCode: 400,
          });
        });
      }
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should return the correct comments', async () => {
        const space1 = 'space1';

        const [secCase, obsCase] = await Promise.all([
          // Create case owned by the security solution user
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            { user: secOnly, space: space1 }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            { user: obsOnly, space: space1 }
          ),
          // Create case owned by the observability user
        ]);

        await Promise.all([
          createComment({
            supertest: supertestWithoutAuth,
            caseId: secCase.id,
            params: postCommentUserReq,
            auth: { user: secOnly, space: space1 },
          }),
          createComment({
            supertest: supertestWithoutAuth,
            caseId: obsCase.id,
            params: { ...postCommentUserReq, owner: 'observabilityFixture' },
            auth: { user: obsOnly, space: space1 },
          }),
        ]);

        for (const scenario of [
          {
            user: globalRead,
            numExpectedEntites: 1,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            caseID: secCase.id,
          },
          {
            user: globalRead,
            numExpectedEntites: 1,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            caseID: obsCase.id,
          },
          {
            user: superUser,
            numExpectedEntites: 1,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            caseID: secCase.id,
          },
          {
            user: superUser,
            numExpectedEntites: 1,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            caseID: obsCase.id,
          },
          {
            user: secOnlyRead,
            numExpectedEntites: 1,
            owners: ['securitySolutionFixture'],
            caseID: secCase.id,
          },
          {
            user: obsOnlyRead,
            numExpectedEntites: 1,
            owners: ['observabilityFixture'],
            caseID: obsCase.id,
          },
          {
            user: obsSecRead,
            numExpectedEntites: 1,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            caseID: secCase.id,
          },
          {
            user: obsSecRead,
            numExpectedEntites: 1,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            caseID: obsCase.id,
          },
        ]) {
          const caseComments = await findAttachments({
            supertest: supertestWithoutAuth,
            caseId: scenario.caseID,
            auth: { user: scenario.user, space: space1 },
          });

          ensureSavedObjectIsAuthorized(
            caseComments.comments,
            scenario.numExpectedEntites,
            scenario.owners
          );
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should NOT read a comment`, async () => {
          // super user creates a case and comment in the appropriate space
          const caseInfo = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            { user: superUser, space: scenario.space }
          );

          await createComment({
            supertest: supertestWithoutAuth,
            auth: { user: superUser, space: scenario.space },
            params: { ...postCommentUserReq, owner: 'securitySolutionFixture' },
            caseId: caseInfo.id,
          });

          // user should not be able to read comments
          await supertestWithoutAuth
            .get(`${getSpaceUrlPrefix(scenario.space)}${CASES_URL}/${caseInfo.id}/comments/_find`)
            .auth(scenario.user.username, scenario.user.password)
            .expect(403);
        });
      }

      // This test ensures that the user is not allowed to define the namespaces query param
      // so she cannot search across spaces
      it('should NOT allow to pass a namespaces query parameter', async () => {
        const obsCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200
        );

        await createComment({
          supertest,
          params: { ...postCommentUserReq, owner: 'observabilityFixture' },
          caseId: obsCase.id,
        });

        await supertest
          .get(`${CASES_URL}/${obsCase.id}/comments/_find?namespaces[0]=*`)
          .expect(400);

        await supertest.get(`${CASES_URL}/${obsCase.id}/comments/_find?namespaces=*`).expect(400);
      });
    });
  });
};
