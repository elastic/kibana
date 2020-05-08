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

  describe('get_all_user_actions', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should return case user actions', async () => {
      const { body: b } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);
      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: b.id,
              version: b.version,
              status: 'closed',
            },
          ],
        })
        .expect(200);
      await supertest
        .post(`${CASES_URL}/${b.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);

      const { body } = await supertest
        .get(`${CASES_URL}/${b.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);
      expect(body.length).to.eql(3);
      const createAction = body[0];
      const statusAction = body[1];
      const commentAction = body[2];

      expect(createAction.action_field).to.eql(['description', 'status', 'tags', 'title']);
      expect(createAction.action).to.eql('create');
      expect(createAction.old_value).to.eql(null);
      expect(createAction.new_value).to.eql(JSON.stringify(postCaseReq));

      expect(statusAction.action_field).to.eql(['status']);
      expect(statusAction.action).to.eql('update');
      expect(statusAction.old_value).to.eql('open');
      expect(statusAction.new_value).to.eql('closed');

      expect(commentAction.action_field).to.eql(['comment']);
      expect(commentAction.action).to.eql('create');
      expect(commentAction.old_value).to.eql(null);
      expect(commentAction.new_value).to.eql(postCommentReq.comment);
    });
  });
};
