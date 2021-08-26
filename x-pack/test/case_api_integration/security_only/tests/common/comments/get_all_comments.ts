/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  getAllComments,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnlySpacesAll,
  obsOnlyReadSpacesAll,
  obsSecSpacesAll,
  obsSecReadSpacesAll,
  secOnlySpacesAll,
  secOnlyReadSpacesAll,
  superUser,
} from '../../../../common/lib/authentication/users';
import { superUserDefaultSpaceAuth } from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');

  describe('get_all_comments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    it('should get all comments when the user has the correct permissions', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: superUserDefaultSpaceAuth,
      });

      await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: superUserDefaultSpaceAuth,
      });

      for (const user of [
        globalRead,
        superUser,
        secOnlySpacesAll,
        secOnlyReadSpacesAll,
        obsSecSpacesAll,
        obsSecReadSpacesAll,
      ]) {
        const comments = await getAllComments({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          auth: { user, space: null },
        });

        expect(comments.length).to.eql(2);
      }
    });

    it('should not get comments when the user does not have correct permission', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        superUserDefaultSpaceAuth
      );

      await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: superUserDefaultSpaceAuth,
      });

      for (const scenario of [
        { user: noKibanaPrivileges, returnCode: 403 },
        { user: obsOnlySpacesAll, returnCode: 200 },
        { user: obsOnlyReadSpacesAll, returnCode: 200 },
      ]) {
        const comments = await getAllComments({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          auth: { user: scenario.user, space: null },
          expectedHttpCode: scenario.returnCode,
        });

        // only check the length if we get a 200 in response
        if (scenario.returnCode === 200) {
          expect(comments.length).to.be(0);
        }
      }
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
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: superUserDefaultSpaceAuth,
      });

      await getAllComments({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        auth: { user: secOnlySpacesAll, space: 'space1' },
        expectedHttpCode: 404,
      });
    });
  });
};
