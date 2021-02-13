/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/case/common/constants';
import { CommentType } from '../../../../../../plugins/case/common/api';
import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import { deleteCases, deleteCasesUserActions, deleteComments } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_comments', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should find all case comment', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      // post 2 comments
      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: caseComments } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(caseComments.comments).to.eql(patchedCase.comments);
    });

    it('should filter case comments', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      // post 2 comments
      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({ comment: 'unique', type: CommentType.user })
        .expect(200);

      const { body: caseComments } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/_find?search=unique`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(caseComments.comments).to.eql([patchedCase.comments[1]]);
    });

    it('unhappy path - 400s when query is bad', async () => {
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
        .get(`${CASES_URL}/${postedCase.id}/comments/_find?perPage=true`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);
    });
  });
};
