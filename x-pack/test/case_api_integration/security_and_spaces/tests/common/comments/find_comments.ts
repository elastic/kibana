/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { CommentsResponse, CommentType } from '../../../../../../plugins/cases/common/api';
import { postCaseReq, postCommentAlertReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createCaseAsUser,
  createComment,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  ensureSavedObjectIsAuthorized,
  getSpaceUrlPrefix,
} from '../../../../common/lib/utils';

import {
  obsOnly,
  secOnly,
  obsOnlyRead,
  secOnlyRead,
  noKibanaPrivileges,
  superUser,
  globalRead,
  obsSecRead,
  obsSec,
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
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      // post 2 comments
      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: caseComments } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(caseComments.comments).to.eql(patchedCase.comments);
    });

    it('should filter case comments', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      // post 2 comments
      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({ comment: 'unique', type: CommentType.user })
        .expect(200);

      const { body: caseComments } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/_find?search=unique`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(caseComments.comments).to.eql([patchedCase.comments[1]]);
    });

    it('unhappy path - 400s when query is bad', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/_find?perPage=true`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);
    });

    it('should return a 400 when passing the subCaseId parameter', async () => {
      const { body } = await supertest
        .get(`${CASES_URL}/case-id/comments/_find?search=unique&subCaseId=value`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);

      expect(body.message).to.contain('disabled');
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('sub case comments', () => {
      let actionID: string;
      before(async () => {
        actionID = await createCaseAction(supertest);
      });
      after(async () => {
        await deleteCaseAction(supertest, actionID);
      });
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('finds comments for a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        const { body: subCaseComments }: { body: CommentsResponse } = await supertest
          .get(`${CASES_URL}/${caseInfo.id}/comments/_find?subCaseId=${caseInfo.subCases![0].id}`)
          .send()
          .expect(200);
        expect(subCaseComments.total).to.be(2);
        expect(subCaseComments.comments[0].type).to.be(CommentType.generatedAlert);
        expect(subCaseComments.comments[1].type).to.be(CommentType.user);
      });
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
          createCaseAsUser({
            supertestWithoutAuth,
            user: secOnly,
            space: space1,
            owner: 'securitySolutionFixture',
          }),
          // Create case owned by the observability user
          createCaseAsUser({
            supertestWithoutAuth,
            user: obsOnly,
            space: space1,
            owner: 'observabilityFixture',
          }),
        ]);

        await Promise.all([
          createComment({
            supertest: supertestWithoutAuth,
            caseId: secCase.id,
            params: postCommentUserReq,
            user: secOnly,
            space: space1,
          }),
          createComment({
            supertest: supertestWithoutAuth,
            caseId: obsCase.id,
            params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
            user: obsOnly,
            space: space1,
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
          const { body: caseComments } = await supertest
            .get(`${getSpaceUrlPrefix(space1)}${CASES_URL}/${scenario.caseID}/comments/_find`)
            .auth(scenario.user.username, scenario.user.password)
            .expect(200);

          ensureSavedObjectIsAuthorized(caseComments, scenario.numExpectedEntites, scenario.owners);
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
          const caseInfo = await createCaseAsUser({
            supertestWithoutAuth,
            user: superUser,
            space: scenario.space,
            owner: 'securitySolutionFixture',
          });

          await createComment({
            supertest: supertestWithoutAuth,
            user: superUser,
            space: scenario.space,
            params: { ...postCommentUserReq, owner: 'securitySolutionFixture' },
            caseId: caseInfo.id,
          });

          // user should not be able to read comments
          await supertest
            .get(`${getSpaceUrlPrefix(scenario.space)}${CASES_URL}/${caseInfo.id}/comments/_find`)
            .auth(scenario.user.username, scenario.user.password)
            .expect(403);
        });
      }

      it('should return no comments when trying to exploit RBAC through the search query parameter', async () => {
        const obsCase = await createCaseAsUser({
          supertestWithoutAuth,
          user: superUser,
          space: 'space1',
          owner: 'observabilityFixture',
        });

        await createComment({
          supertest: supertestWithoutAuth,
          user: superUser,
          space: 'space1',
          params: { ...postCommentUserReq, owner: 'observabilityFixture' },
          caseId: obsCase.id,
        });

        const { body: comments } = await supertest
          .get(
            `${getSpaceUrlPrefix('space1')}${CASES_URL}/${
              obsCase.id
            }/comments/_find?search=securitySolutionFixture+observabilityFixture&searchFields=owner`
          )
          .auth(secOnly.username, secOnly.password)
          .expect(200);

        // shouldn't find any comments since they were created under the observability ownership
        ensureSavedObjectIsAuthorized(comments, 0, ['securitySolutionFixture']);
      });

      // TODO: create test that checks that you can't create a comment with a different owner than the case
      // TODO: create test that checks that you can't modify the owner of a comment

      // TODO: Finish these
      // This test is to prevent a future developer to add the filter attribute without taking into consideration
      // the authorizationFilter produced by the cases authorization class
      it('should NOT allow to pass a filter query parameter', async () => {
        await supertest
          .get(
            `${CASES_URL}/_find?sortOrder=asc&filter=cases.attributes.owner=observabilityFixture`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });

      // This test ensures that the user is not allowed to define the namespaces query param
      // so she cannot search across spaces
      it('should NOT allow to pass a namespaces query parameter', async () => {
        await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&namespaces[0]=*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);

        await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&namespaces=*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });

      it('should NOT allow to pass a non supported query parameter', async () => {
        await supertest
          .get(`${CASES_URL}/_find?notExists=papa`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
      });

      it('should respect the owner filter when having permissions', async () => {
        await Promise.all([
          await createCaseAsUser({
            supertestWithoutAuth,
            user: obsSec,
            space: 'space1',
            owner: 'securitySolutionFixture',
          }),
          await createCaseAsUser({
            supertestWithoutAuth,
            user: obsSec,
            space: 'space1',
            owner: 'observabilityFixture',
          }),
        ]);

        const res = await findCasesAsUser({
          supertestWithoutAuth,
          user: obsSec,
          space: 'space1',
          appendToUrl: 'owner=securitySolutionFixture',
        });

        ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
      });

      it('should return the correct cases when trying to exploit RBAC through the owner query parameter', async () => {
        await Promise.all([
          await createCaseAsUser({
            supertestWithoutAuth,
            user: obsSec,
            space: 'space1',
            owner: 'securitySolutionFixture',
          }),
          await createCaseAsUser({
            supertestWithoutAuth,
            user: obsSec,
            space: 'space1',
            owner: 'observabilityFixture',
          }),
        ]);

        // User with permissions only to security solution request cases from observability
        const res = await findCasesAsUser({
          supertestWithoutAuth,
          user: secOnly,
          space: 'space1',
          appendToUrl: 'owner=securitySolutionFixture&owner=observabilityFixture',
        });

        // Only security solution cases are being returned
        ensureSavedObjectIsAuthorized(res.cases, 1, ['securitySolutionFixture']);
      });
    });
  });
};
