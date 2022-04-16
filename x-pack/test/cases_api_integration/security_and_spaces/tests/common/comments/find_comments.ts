/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import { CommentsResponse } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  getPostCaseRequest,
  postCaseReq,
  postCommentAlertReq,
  postCommentUserReq,
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
  superUserSpace1Auth,
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
        .send({ ...postCommentUserReq, comment: 'unique' })
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
            params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
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
          const { body: caseComments }: { body: CommentsResponse } = await supertestWithoutAuth
            .get(`${getSpaceUrlPrefix(space1)}${CASES_URL}/${scenario.caseID}/comments/_find`)
            .auth(scenario.user.username, scenario.user.password)
            .expect(200);

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

      it('should not return any comments when trying to exploit RBAC through the search query parameter', async () => {
        const obsCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          auth: superUserSpace1Auth,
          params: { ...postCommentUserReq, owner: 'observabilityFixture' },
          caseId: obsCase.id,
        });

        const { body: res }: { body: CommentsResponse } = await supertestWithoutAuth
          .get(
            `${getSpaceUrlPrefix('space1')}${CASES_URL}/${
              obsCase.id
            }/comments/_find?search=securitySolutionFixture+observabilityFixture`
          )
          .auth(secOnly.username, secOnly.password)
          .expect(200);

        // shouldn't find any comments since they were created under the observability ownership
        ensureSavedObjectIsAuthorized(res.comments, 0, ['securitySolutionFixture']);
      });

      it('should not allow retrieving unauthorized comments using the filter field', async () => {
        const obsCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          auth: superUserSpace1Auth,
          params: { ...postCommentUserReq, owner: 'observabilityFixture' },
          caseId: obsCase.id,
        });

        const { body: res } = await supertestWithoutAuth
          .get(
            `${getSpaceUrlPrefix('space1')}${CASES_URL}/${
              obsCase.id
            }/comments/_find?filter=cases-comments.attributes.owner:"observabilityFixture"`
          )
          .auth(secOnly.username, secOnly.password)
          .expect(200);
        expect(res.comments.length).to.be(0);
      });

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

      it('should NOT allow to pass a non supported query parameter', async () => {
        await supertest.get(`${CASES_URL}/id/comments/_find?notExists=papa`).expect(400);
        await supertest.get(`${CASES_URL}/id/comments/_find?owner=papa`).expect(400);
      });
    });
  });
};
