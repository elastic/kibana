/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/case/common/constants';
import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
} from '../../../../common/lib/utils';
import { CommentResponse, CommentType } from '../../../../../../plugins/case/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_comment', () => {
    let actionID: string;
    before(async () => {
      actionID = await createCaseAction(supertest);
    });
    after(async () => {
      await deleteCaseAction(supertest, actionID);
    });
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should get a comment', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: comment } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/${patchedCase.comments[0].id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(comment).to.eql(patchedCase.comments[0]);
    });
    it('should get a sub case comment', async () => {
      const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
      const { body: comment }: { body: CommentResponse } = await supertest
        .get(`${CASES_URL}/${caseInfo.id}/comments/${caseInfo.subCase!.comments![0].id}`)
        .expect(200);
      expect(comment.type).to.be(CommentType.generatedAlert);
    });
    it('unhappy path - 404s when comment is not there', async () => {
      await supertest
        .get(`${CASES_URL}/fake-id/comments/fake-comment`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
    });
  });
};
