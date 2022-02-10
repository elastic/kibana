/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  getAllComments,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('get_all_comments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should get multiple comments for a single case in space1', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200, authSpace1);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });
      const comments = await getAllComments({ supertest, caseId: postedCase.id, auth: authSpace1 });

      expect(comments.length).to.eql(2);
    });

    it('should not find any comments in space2', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200, authSpace1);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });
      const comments = await getAllComments({
        supertest,
        caseId: postedCase.id,
        auth: getAuthWithSuperUser('space2'),
      });

      expect(comments.length).to.eql(0);
    });
  });
};
