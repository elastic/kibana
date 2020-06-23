/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/case/common/constants';
import { defaultUser, postCaseReq, postCommentReq } from '../../../../common/lib/mock';
import { deleteCases, deleteCasesUserActions, deleteComments } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_comment', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should patch a comment', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);
      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      const { body } = await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: patchedCase.comments[0].version,
          comment: newComment,
        });
      expect(body.comments[0].comment).to.eql(newComment);
      expect(body.updated_by).to.eql(defaultUser);
    });

    it('unhappy path - 404s when comment is not there', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);
      await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: 'id',
          version: 'version',
          comment: 'comment',
        })
        .expect(404);
    });

    it('unhappy path - 404s when case is not there', async () => {
      await supertest
        .patch(`${CASES_URL}/fake-id/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: 'id',
          version: 'version',
          comment: 'comment',
        })
        .expect(404);
    });

    it('unhappy path - 400s when patch body is bad', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);
      await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: patchedCase.comments[0].version,
          comment: true,
        })
        .expect(400);
    });

    it('unhappy path - 409s when conflict', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);
      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: 'version-mismatch',
          comment: newComment,
        })
        .expect(409);
    });
  });
};
