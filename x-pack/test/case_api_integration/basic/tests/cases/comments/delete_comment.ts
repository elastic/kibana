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
  deleteCases,
  deleteCasesUserActions,
  deleteComments,
} from '../../../../common/lib/utils';

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
        .send(postCommentUserReq)
        .expect(200);

      const { body: comment } = await supertest
        .delete(`${CASES_URL}/${postedCase.id}/comments/${patchedCase.comments[0].id}`)
        .set('kbn-xsrf', 'true')
        .expect(204)
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
        .send(postCommentUserReq)
        .expect(200);

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

    describe('sub case comments', () => {
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

      it('deletes a comment from a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        await supertest
          .delete(
            `${CASES_URL}/${caseInfo.id}/comments/${caseInfo.subCase!.comments![0].id}?subCaseID=${
              caseInfo.subCase!.id
            }`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);
        const { body } = await supertest.get(
          `${CASES_URL}/${caseInfo.id}/comments?subCaseID=${caseInfo.subCase!.id}`
        );
        expect(body.length).to.eql(0);
      });

      it('deletes all comments from a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments?subCaseID=${caseInfo.subCase!.id}`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        let { body: allComments } = await supertest.get(
          `${CASES_URL}/${caseInfo.id}/comments?subCaseID=${caseInfo.subCase!.id}`
        );
        expect(allComments.length).to.eql(2);

        await supertest
          .delete(`${CASES_URL}/${caseInfo.id}/comments?subCaseID=${caseInfo.subCase!.id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        ({ body: allComments } = await supertest.get(
          `${CASES_URL}/${caseInfo.id}/comments?subCaseID=${caseInfo.subCase!.id}`
        ));

        // no comments for the sub case
        expect(allComments.length).to.eql(0);

        ({ body: allComments } = await supertest.get(`${CASES_URL}/${caseInfo.id}/comments`));

        // no comments for the collection
        expect(allComments.length).to.eql(0);
      });
    });
  });
};
