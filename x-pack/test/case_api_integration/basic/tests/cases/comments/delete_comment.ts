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

  describe('delete_comment', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should delete a comment', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);

      const { body: comment } = await supertest
        .delete(`${CASES_URL}/${postedCase.id}/comments/${patchedCase.comments[0].id}`)
        .set('kbn-xsrf', 'true')
        .send();

      expect(comment).to.eql({});
    });

    it('unhappy path - 404s when comment belongs to different case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);

      const { body } = await supertest
        .delete(`${CASES_URL}/fake-id/comments/${patchedCase.comments[0].id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
      expect(body.message).to.eql(
        `This comment ${patchedCase.comments[0].id} does not exist in fake-id).`
      );
    });

    it('unhappy path - 404s when comment is not there', async () => {
      await supertest
        .delete(`${CASES_URL}/fake-id/comments/fake-id`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
    });
  });
};
