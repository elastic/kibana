/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  deleteComment,
  deleteAllComments,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
} from '../../../../common/lib/authentication/users';
import { obsOnlyNoSpaceAuth, secOnlyNoSpaceAuth } from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const superUserNoSpaceAuth = getAuthWithSuperUser(null);

  describe('delete_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should delete a comment from the appropriate owner', async () => {
      const secCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyNoSpaceAuth
      );

      const commentResp = await createComment({
        supertest: supertestWithoutAuth,
        caseId: secCase.id,
        params: postCommentUserReq,
        auth: secOnlyNoSpaceAuth,
      });

      await deleteComment({
        supertest: supertestWithoutAuth,
        caseId: secCase.id,
        commentId: commentResp.comments![0].id,
        auth: secOnlyNoSpaceAuth,
      });
    });

    it('should delete multiple comments from the appropriate owner', async () => {
      const secCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyNoSpaceAuth
      );

      await createComment({
        supertest: supertestWithoutAuth,
        caseId: secCase.id,
        params: postCommentUserReq,
        auth: secOnlyNoSpaceAuth,
      });

      await createComment({
        supertest: supertestWithoutAuth,
        caseId: secCase.id,
        params: postCommentUserReq,
        auth: secOnlyNoSpaceAuth,
      });

      await deleteAllComments({
        supertest: supertestWithoutAuth,
        caseId: secCase.id,
        auth: secOnlyNoSpaceAuth,
      });
    });

    it('should not delete a comment from a different owner', async () => {
      const secCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyNoSpaceAuth
      );

      const commentResp = await createComment({
        supertest: supertestWithoutAuth,
        caseId: secCase.id,
        params: postCommentUserReq,
        auth: secOnlyNoSpaceAuth,
      });

      await deleteComment({
        supertest: supertestWithoutAuth,
        caseId: secCase.id,
        commentId: commentResp.comments![0].id,
        auth: obsOnlyNoSpaceAuth,
        expectedHttpCode: 403,
      });

      await deleteAllComments({
        supertest: supertestWithoutAuth,
        caseId: secCase.id,
        auth: obsOnlyNoSpaceAuth,
        expectedHttpCode: 403,
      });
    });

    for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} - should NOT delete a comment`, async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          superUserNoSpaceAuth
        );

        const commentResp = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: superUserNoSpaceAuth,
        });

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          commentId: commentResp.comments![0].id,
          auth: { user, space: null },
          expectedHttpCode: 403,
        });

        await deleteAllComments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user, space: null },
          expectedHttpCode: 403,
        });
      });
    }

    it('should not delete a comment with no kibana privileges', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserNoSpaceAuth
      );

      const commentResp = await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: superUserNoSpaceAuth,
      });

      await deleteComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        commentId: commentResp.comments![0].id,
        auth: { user: noKibanaPrivileges, space: null },
        expectedHttpCode: 403,
      });

      await deleteAllComments({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        auth: { user: noKibanaPrivileges, space: null },
        // the find in the delete all will return no results
        expectedHttpCode: 404,
      });
    });

    it('should return a 404 when attempting to access a space', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserNoSpaceAuth
      );

      const commentResp = await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: superUserNoSpaceAuth,
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
};
