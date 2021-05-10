/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCommentUserReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  getComment,
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
import { superUserNoSpaceAuth } from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');

  describe('get_comment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    it('should get a comment when the user has the correct permissions', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserNoSpaceAuth
      );

      const caseWithComment = await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: superUserNoSpaceAuth,
      });

      for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
        await getComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          commentId: caseWithComment.comments![0].id,
          auth: { user, space: null },
        });
      }
    });

    it('should not get comment when the user does not have correct permissions', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserNoSpaceAuth
      );

      const caseWithComment = await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: superUserNoSpaceAuth,
      });

      for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
        await getComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          commentId: caseWithComment.comments![0].id,
          auth: { user, space: null },
          expectedHttpCode: 403,
        });
      }
    });

    it('should return a 404 when attempting to access a space', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserNoSpaceAuth
      );

      const caseWithComment = await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: superUserNoSpaceAuth,
      });

      await getComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        commentId: caseWithComment.comments![0].id,
        auth: { user: secOnly, space: 'space1' },
        expectedHttpCode: 404,
      });
    });
  });
};
