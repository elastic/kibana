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
import { CommentType } from '../../../../../../plugins/case/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_all_comments', () => {
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

    it('should get multiple comments for a single case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: comments } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(comments.length).to.eql(2);
    });

    it('should get comments from a case and its sub cases', async () => {
      const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
      await supertest
        .post(`${CASES_URL}/${caseInfo.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: comments } = await supertest
        .get(`${CASES_URL}/${caseInfo.id}/comments?includeSubCaseComments=true`)
        .expect(200);

      expect(comments.length).to.eql(2);
      expect(comments[0].type).to.eql(CommentType.generatedAlert);
      expect(comments[1].type).to.eql(CommentType.user);
    });

    it('should get comments from a sub cases', async () => {
      const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
      await supertest
        .post(`${CASES_URL}/${caseInfo.subCase!.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: comments } = await supertest
        .get(`${CASES_URL}/${caseInfo.id}/comments?subCaseID=${caseInfo.subCase!.id}`)
        .expect(200);

      expect(comments.length).to.eql(2);
      expect(comments[0].type).to.eql(CommentType.generatedAlert);
      expect(comments[1].type).to.eql(CommentType.user);
    });

    it('should not find any comments for an invalid case id', async () => {
      const { body } = await supertest
        .get(`${CASES_URL}/fake-id/comments`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);
      expect(body.length).to.eql(0);
    });
  });
};
