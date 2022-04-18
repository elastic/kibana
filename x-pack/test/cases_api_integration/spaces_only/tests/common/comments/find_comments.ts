/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createComment,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  getSpaceUrlPrefix,
  createCase,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('find_comments', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should find all case comments in space1', async () => {
      const caseInfo = await createCase(supertest, getPostCaseRequest(), 200, authSpace1);
      await createComment({
        supertest,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const patchedCase = await createComment({
        supertest,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const { body: caseComments } = await supertest
        .get(`${getSpaceUrlPrefix(authSpace1.space)}${CASES_URL}/${caseInfo.id}/comments/_find`)
        .expect(200);

      expect(caseComments.comments).to.eql(patchedCase.comments);
    });

    it('should not find any case comments in space2', async () => {
      const caseInfo = await createCase(supertest, getPostCaseRequest(), 200, authSpace1);
      await createComment({
        supertest,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      await createComment({
        supertest,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const { body: caseComments } = await supertest
        .get(`${getSpaceUrlPrefix('space2')}${CASES_URL}/${caseInfo.id}/comments/_find`)
        .expect(200);

      expect(caseComments.comments.length).to.eql(0);
    });
  });
};
