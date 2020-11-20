/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/case/common/constants';
import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
} from '../../../../common/lib/mock';
import { deleteCases, deleteCasesUserActions, deleteComments } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('post_comment', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should post a comment', async () => {
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

      expect(patchedCase.comments[0].type).to.eql(postCommentUserReq.type);
      expect(patchedCase.comments[0].comment).to.eql(postCommentUserReq.comment);
      expect(patchedCase.updated_by).to.eql(defaultUser);
    });

    it('should post an alert', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentAlertReq)
        .expect(200);

      expect(patchedCase.comments[0].type).to.eql(postCommentAlertReq.type);
      expect(patchedCase.comments[0].alertId).to.eql(postCommentAlertReq.alertId);
      expect(patchedCase.comments[0].index).to.eql(postCommentAlertReq.index);
      expect(patchedCase.updated_by).to.eql(defaultUser);
    });

    it('unhappy path - 400s when type is missing', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          bad: 'comment',
        })
        .expect(400);
    });

    it('unhappy path - 400s when missing attributes for type user', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({ type: 'user' })
        .expect(400);
    });

    it('unhappy path - 400s when adding excess attributes for type user', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      for (const attribute of ['alertId', 'index']) {
        await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({ type: 'user', [attribute]: attribute, comment: 'a comment' })
          .expect(400);
      }
    });

    it('unhappy path - 400s when missing attributes for type alert', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const allRequestAttributes = {
        type: 'alert',
        index: 'test-index',
        alertId: 'test-id',
      };

      for (const attribute of ['alertId', 'index']) {
        const requestAttributes = omit(attribute, allRequestAttributes);
        await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send(requestAttributes)
          .expect(400);
      }
    });

    it('unhappy path - 400s when adding excess attributes for type alert', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      for (const attribute of ['comment']) {
        await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({ type: 'alert', [attribute]: attribute, alertId: 'test-id', index: 'test-index' })
          .expect(400);
      }
    });

    it('unhappy path - 400s when case is missing', async () => {
      await supertest
        .post(`${CASES_URL}/not-exists/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          bad: 'comment',
        })
        .expect(400);
    });
  });
};
