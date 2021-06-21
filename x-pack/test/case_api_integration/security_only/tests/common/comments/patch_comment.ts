/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { AttributesTypeUser, CommentType } from '../../../../../../plugins/cases/common/api';
import { defaultUser, postCommentUserReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  updateComment,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnlyReadSpacesAll,
  obsSecReadSpacesAll,
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
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

  describe('patch_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should update a comment that the user has permissions for', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: superUserDefaultSpaceAuth,
      });

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      const updatedCase = await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          ...postCommentUserReq,
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          comment: newComment,
        },
        auth: secOnlyDefaultSpaceAuth,
      });

      const userComment = updatedCase.comments![0] as AttributesTypeUser;
      expect(userComment.comment).to.eql(newComment);
      expect(userComment.type).to.eql(CommentType.user);
      expect(updatedCase.updated_by).to.eql(defaultUser);
      expect(userComment.owner).to.eql('securitySolutionFixture');
    });

    it('should not update a comment that has a different owner thant he user has access to', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      const patchedCase = await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: superUserDefaultSpaceAuth,
      });

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      await updateComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        req: {
          ...postCommentUserReq,
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          comment: newComment,
        },
        auth: obsOnlyDefaultSpaceAuth,
        expectedHttpCode: 403,
      });
    });

    for (const user of [
      globalRead,
      secOnlyReadSpacesAll,
      obsOnlyReadSpacesAll,
      obsSecReadSpacesAll,
      noKibanaPrivileges,
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} - should NOT update a comment`, async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest(),
          200,
          superUserDefaultSpaceAuth
        );

        const patchedCase = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: superUserDefaultSpaceAuth,
        });

        const newComment = 'Well I decided to update my comment. So what? Deal with it.';
        await updateComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          req: {
            ...postCommentUserReq,
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            comment: newComment,
          },
          auth: { user, space: null },
          expectedHttpCode: 403,
        });
      });
    }

    it('should return a 404 when attempting to access a space', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      const patchedCase = await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: superUserDefaultSpaceAuth,
      });

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      await updateComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        req: {
          ...postCommentUserReq,
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          comment: newComment,
        },
        auth: { user: secOnlySpacesAll, space: 'space1' },
        expectedHttpCode: 404,
      });
    });
  });
};
