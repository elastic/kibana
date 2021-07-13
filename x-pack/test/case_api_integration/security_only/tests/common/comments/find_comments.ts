/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { CommentsResponse } from '../../../../../../plugins/cases/common/api';
import {
  getPostCaseRequest,
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
} from '../../../../common/lib/utils';

import {
  secOnlySpacesAll,
  obsOnlyReadSpacesAll,
  secOnlyReadSpacesAll,
  noKibanaPrivileges,
  superUser,
  globalRead,
  obsSecReadSpacesAll,
} from '../../../../common/lib/authentication/users';
import {
  obsOnlyDefaultSpaceAuth,
  secOnlyDefaultSpaceAuth,
  superUserDefaultSpaceAuth,
} from '../../../utils';

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

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should return the correct comments', async () => {
      const [secCase, obsCase] = await Promise.all([
        // Create case owned by the security solution user
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyDefaultSpaceAuth),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsOnlyDefaultSpaceAuth
        ),
        // Create case owned by the observability user
      ]);

      await Promise.all([
        createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: secOnlyDefaultSpaceAuth,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: obsCase.id,
          params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
          auth: obsOnlyDefaultSpaceAuth,
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
          user: secOnlyReadSpacesAll,
          numExpectedEntites: 1,
          owners: ['securitySolutionFixture'],
          caseID: secCase.id,
        },
        {
          user: obsOnlyReadSpacesAll,
          numExpectedEntites: 1,
          owners: ['observabilityFixture'],
          caseID: obsCase.id,
        },
        {
          user: obsSecReadSpacesAll,
          numExpectedEntites: 1,
          owners: ['securitySolutionFixture', 'observabilityFixture'],
          caseID: secCase.id,
        },
        {
          user: obsSecReadSpacesAll,
          numExpectedEntites: 1,
          owners: ['securitySolutionFixture', 'observabilityFixture'],
          caseID: obsCase.id,
        },
      ]) {
        const { body: caseComments }: { body: CommentsResponse } = await supertestWithoutAuth
          .get(`${getSpaceUrlPrefix(null)}${CASES_URL}/${scenario.caseID}/comments/_find`)
          .auth(scenario.user.username, scenario.user.password)
          .expect(200);

        ensureSavedObjectIsAuthorized(
          caseComments.comments,
          scenario.numExpectedEntites,
          scenario.owners
        );
      }
    });

    it(`User ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()} - should NOT read a comment`, async () => {
      // super user creates a case and comment in the appropriate space
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      await createComment({
        supertest: supertestWithoutAuth,
        auth: { user: superUser, space: null },
        params: { ...postCommentUserReq, owner: 'securitySolutionFixture' },
        caseId: caseInfo.id,
      });

      // user should not be able to read comments
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix(null)}${CASES_URL}/${caseInfo.id}/comments/_find`)
        .auth(noKibanaPrivileges.username, noKibanaPrivileges.password)
        .expect(403);
    });

    it('should return a 404 when attempting to access a space', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      await createComment({
        supertest: supertestWithoutAuth,
        auth: superUserDefaultSpaceAuth,
        params: { ...postCommentUserReq, owner: 'securitySolutionFixture' },
        caseId: caseInfo.id,
      });

      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix('space1')}${CASES_URL}/${caseInfo.id}/comments/_find`)
        .auth(secOnlySpacesAll.username, secOnlySpacesAll.password)
        .expect(404);
    });

    it('should not return any comments when trying to exploit RBAC through the search query parameter', async () => {
      const obsCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture' }),
        200,
        superUserDefaultSpaceAuth
      );

      await createComment({
        supertest: supertestWithoutAuth,
        auth: superUserDefaultSpaceAuth,
        params: { ...postCommentUserReq, owner: 'observabilityFixture' },
        caseId: obsCase.id,
      });

      const { body: res }: { body: CommentsResponse } = await supertestWithoutAuth
        .get(
          `${getSpaceUrlPrefix(null)}${CASES_URL}/${
            obsCase.id
          }/comments/_find?search=securitySolutionFixture+observabilityFixture`
        )
        .auth(secOnlySpacesAll.username, secOnlySpacesAll.password)
        .expect(200);

      // shouldn't find any comments since they were created under the observability ownership
      ensureSavedObjectIsAuthorized(res.comments, 0, ['securitySolutionFixture']);
    });

    it('should not allow retrieving unauthorized comments using the filter field', async () => {
      const obsCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest({ owner: 'observabilityFixture' }),
        200,
        superUserDefaultSpaceAuth
      );

      await createComment({
        supertest: supertestWithoutAuth,
        auth: superUserDefaultSpaceAuth,
        params: { ...postCommentUserReq, owner: 'observabilityFixture' },
        caseId: obsCase.id,
      });

      const { body: res } = await supertestWithoutAuth
        .get(
          `${getSpaceUrlPrefix(null)}${CASES_URL}/${
            obsCase.id
          }/comments/_find?filter=cases-comments.attributes.owner:"observabilityFixture"`
        )
        .auth(secOnlySpacesAll.username, secOnlySpacesAll.password)
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

      await supertest.get(`${CASES_URL}/${obsCase.id}/comments/_find?namespaces[0]=*`).expect(400);

      await supertest.get(`${CASES_URL}/${obsCase.id}/comments/_find?namespaces=*`).expect(400);
    });

    it('should NOT allow to pass a non supported query parameter', async () => {
      await supertest.get(`${CASES_URL}/id/comments/_find?notExists=papa`).expect(400);
      await supertest.get(`${CASES_URL}/id/comments/_find?owner=papa`).expect(400);
    });
  });
};
