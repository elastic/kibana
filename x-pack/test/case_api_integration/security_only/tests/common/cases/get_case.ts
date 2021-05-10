/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { AttributesTypeUser } from '../../../../../../plugins/cases/common/api';
import { postCommentUserReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  createCase,
  getCase,
  createComment,
  removeServerGeneratedPropertiesFromSavedObject,
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
import { secOnlyNoSpaceAuth } from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('get_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should get a case', async () => {
      const newCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
        user: superUser,
        space: null,
      });

      for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
        const theCase = await getCase({
          supertest: supertestWithoutAuth,
          caseId: newCase.id,
          auth: { user, space: null },
        });

        expect(theCase.owner).to.eql('securitySolutionFixture');
      }
    });

    it('should get a case with comments', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        secOnlyNoSpaceAuth
      );

      await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        expectedHttpCode: 200,
        auth: secOnlyNoSpaceAuth,
      });

      const theCase = await getCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        includeComments: true,
        auth: secOnlyNoSpaceAuth,
      });

      const comment = removeServerGeneratedPropertiesFromSavedObject(
        theCase.comments![0] as AttributesTypeUser
      );

      expect(theCase.comments?.length).to.eql(1);
      expect(comment).to.eql({
        type: postCommentUserReq.type,
        comment: postCommentUserReq.comment,
        associationType: 'case',
        created_by: getUserInfo(secOnly),
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
        owner: 'securitySolutionFixture',
      });
    });

    it('should not get a case when the user does not have access to owner', async () => {
      const newCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
        user: superUser,
        space: null,
      });

      for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
        await getCase({
          supertest: supertestWithoutAuth,
          caseId: newCase.id,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      }
    });

    it('should return a 404 when attempting to access a space', async () => {
      const newCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
        user: superUser,
        space: null,
      });

      await getCase({
        supertest: supertestWithoutAuth,
        caseId: newCase.id,
        expectedHttpCode: 404,
        auth: { user: secOnly, space: 'space1' },
      });
    });
  });
};
