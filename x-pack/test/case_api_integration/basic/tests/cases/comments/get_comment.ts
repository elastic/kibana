/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/case/common/constants';
import { postCaseReq, postCommentReq } from '../../../../common/lib/mock';
import { deleteCases, deleteCasesUserActions, deleteComments } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_comment', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should get a comment', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);

      const { body: comment } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/${patchedCase.comments[0].id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(comment).to.eql(patchedCase.comments[0]);
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
