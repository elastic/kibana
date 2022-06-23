/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  deleteComment,
  deleteAllComments,
  superUserSpace1Auth,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    describe('happy path', () => {
      it('should delete a comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const comment = await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId: patchedCase.comments![0].id,
        });

        expect(comment).to.eql({});
      });
    });

    describe('unhappy path', () => {
      it('404s when comment belongs to different case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const error = (await deleteComment({
          supertest,
          caseId: 'fake-id',
          commentId: patchedCase.comments![0].id,
          expectedHttpCode: 404,
        })) as Error;

        expect(error.message).to.be(
          `This comment ${patchedCase.comments![0].id} does not exist in fake-id.`
        );
      });

      it('404s when comment is not there', async () => {
        await deleteComment({
          supertest,
          caseId: 'fake-id',
          commentId: 'fake-id',
          expectedHttpCode: 404,
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should delete a comment from the appropriate owner', async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: secOnly, space: 'space1' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: secOnly, space: 'space1' },
        });
      });

      it('should delete multiple comments from the appropriate owner', async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: secOnly, space: 'space1' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          auth: { user: secOnly, space: 'space1' },
        });
      });

      it('should not delete a comment from a different owner', async () => {
        const secCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: secOnly, space: 'space1' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: secCase.id,
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT delete a comment`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            superUserSpace1Auth
          );

          const commentResp = await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });

          await deleteComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            commentId: commentResp.comments![0].id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });

          await deleteAllComments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should NOT delete a comment in a space with where the user does not have permissions', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });

      it('should NOT delete a comment created in space2 by making a request to space1', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 404,
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 404,
        });
      });
    });
  });
};
