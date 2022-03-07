/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  getAllComments,
  superUserSpace1Auth,
  extractWarningValueFromWarningHeader,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { getCaseCommentsUrl } from '../../../../../../plugins/cases/common/api';
import { assertWarningHeader } from '../../../../common/lib/validation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_all_comments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should get multiple comments for a single case', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      const comments = await getAllComments({ supertest, caseId: postedCase.id });

      expect(comments.length).to.eql(2);
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should get all comments when the user has the correct permissions', async () => {
        const caseInfo = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          const comments = await getAllComments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: { user, space: 'space1' },
          });

          expect(comments.length).to.eql(2);
        }
      });

      it('should not get comments when the user does not have correct permission', async () => {
        const caseInfo = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        for (const scenario of [
          { user: noKibanaPrivileges, returnCode: 403 },
          { user: obsOnly, returnCode: 200 },
          { user: obsOnlyRead, returnCode: 200 },
        ]) {
          const comments = await getAllComments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: { user: scenario.user, space: 'space1' },
            expectedHttpCode: scenario.returnCode,
          });

          // only check the length if we get a 200 in response
          if (scenario.returnCode === 200) {
            expect(comments.length).to.be(0);
          }
        }
      });

      it('should NOT get a comment in a space with no permissions', async () => {
        const caseInfo = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        await getAllComments({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });

    describe('deprecations', () => {
      it('should return a warning header', async () => {
        const theCase = await createCase(supertest, postCaseReq);
        const res = await supertest.get(getCaseCommentsUrl(theCase.id)).expect(200);
        const warningHeader = res.header.warning;

        assertWarningHeader(warningHeader);

        const warningValue = extractWarningValueFromWarningHeader(warningHeader);
        expect(warningValue).to.be('Deprecated endpoint');
      });
    });
  });
};
