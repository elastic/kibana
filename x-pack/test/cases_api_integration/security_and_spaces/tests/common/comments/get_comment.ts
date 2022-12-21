/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, postCommentUserReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  getComment,
  superUserSpace1Auth,
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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_comment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should get a comment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      const comment = await getComment({
        supertest,
        caseId: postedCase.id,
        commentId: patchedCase.comments![0].id,
      });

      expect(comment).to.eql(patchedCase.comments![0]);
    });

    it('unhappy path - 404s when comment is not there', async () => {
      await getComment({
        supertest,
        caseId: 'fake-id',
        commentId: 'fake-id',
        expectedHttpCode: 404,
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should get a comment when the user has the correct permissions', async () => {
        const caseInfo = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const caseWithComment = await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          await getComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            commentId: caseWithComment.comments![0].id,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not get comment when the user does not have correct permissions', async () => {
        const caseInfo = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const caseWithComment = await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
          await getComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            commentId: caseWithComment.comments![0].id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }
      });

      it('should NOT get a case in a space with no permissions', async () => {
        const caseInfo = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        const caseWithComment = await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        await getComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          commentId: caseWithComment.comments![0].id,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
