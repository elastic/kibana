/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { AttributesTypeUser, getCaseDetailsUrl } from '@kbn/cases-plugin/common/api';
import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  defaultUser,
  postCaseReq,
  postCaseResp,
  postCommentUserReq,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  createCase,
  getCase,
  createComment,
  removeServerGeneratedPropertiesFromCase,
  removeServerGeneratedPropertiesFromSavedObject,
  extractWarningValueFromWarningHeader,
} from '../../../../common/lib/utils';
import {
  secOnly,
  obsOnly,
  globalRead,
  superUser,
  secOnlyRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
  obsSec,
} from '../../../../common/lib/authentication/users';
import { getUserInfo } from '../../../../common/lib/authentication';
import { assertWarningHeader } from '../../../../common/lib/validation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('get_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return a case with no comments', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const theCase = await getCase({ supertest, caseId: postedCase.id, includeComments: true });

      const data = removeServerGeneratedPropertiesFromCase(theCase);
      expect(data).to.eql(postCaseResp());
      expect(data.comments?.length).to.eql(0);
    });

    it('should return a case with comments', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({ supertest, caseId: postedCase.id, params: postCommentUserReq });
      const theCase = await getCase({ supertest, caseId: postedCase.id, includeComments: true });

      const comment = removeServerGeneratedPropertiesFromSavedObject(
        theCase.comments![0] as AttributesTypeUser
      );

      expect(theCase.comments?.length).to.eql(1);
      expect(comment).to.eql({
        type: postCommentUserReq.type,
        comment: postCommentUserReq.comment,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
        owner: 'securitySolutionFixture',
      });
    });

    it('unhappy path - 404s when case is not there', async () => {
      await supertest.get(`${CASES_URL}/fake-id`).set('kbn-xsrf', 'true').send().expect(404);
    });

    describe('rbac', () => {
      it('should get a case', async () => {
        const newCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          const theCase = await getCase({
            supertest: supertestWithoutAuth,
            caseId: newCase.id,
            auth: { user, space: 'space1' },
          });

          expect(theCase.owner).to.eql('securitySolutionFixture');
        }
      });

      it('should get a case with comments', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          expectedHttpCode: 200,
          auth: {
            user: secOnly,
            space: 'space1',
          },
        });

        const theCase = await getCase({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          includeComments: true,
          auth: { user: secOnly, space: 'space1' },
        });

        const comment = removeServerGeneratedPropertiesFromSavedObject(
          theCase.comments![0] as AttributesTypeUser
        );

        expect(theCase.comments?.length).to.eql(1);
        expect(comment).to.eql({
          type: postCommentUserReq.type,
          comment: postCommentUserReq.comment,
          created_by: getUserInfo(secOnly),
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
          owner: 'securitySolutionFixture',
        });
      });

      it('should not get a case when the user does not have access to owner', async () => {
        const newCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
          await getCase({
            supertest: supertestWithoutAuth,
            caseId: newCase.id,
            expectedHttpCode: 403,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should NOT get a case in a space with no permissions', async () => {
        const newCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        await getCase({
          supertest: supertestWithoutAuth,
          caseId: newCase.id,
          expectedHttpCode: 403,
          auth: { user: secOnly, space: 'space2' },
        });
      });
    });

    describe('deprecations', () => {
      for (const paramValue of [true, false]) {
        it(`should return a warning header if includeComments=${paramValue}`, async () => {
          const theCase = await createCase(supertest, postCaseReq);
          const res = await supertest
            .get(`${getCaseDetailsUrl(theCase.id)}?includeComments=${paramValue}`)
            .expect(200);
          const warningHeader = res.header.warning;

          assertWarningHeader(warningHeader);

          const warningValue = extractWarningValueFromWarningHeader(warningHeader);
          expect(warningValue).to.be('Deprecated query parameter includeComments');
        });
      }

      it('should not return a warning header if includeComments is not provided', async () => {
        const theCase = await createCase(supertest, postCaseReq);
        const res = await supertest.get(getCaseDetailsUrl(theCase.id)).expect(200);
        const warningHeader = res.header.warning;
        expect(warningHeader).to.be(undefined);
      });
    });
  });
};
