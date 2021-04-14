/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  deleteComment,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    describe('happy path', () => {
      it('should delete a comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);
        const comment = await deleteComment(supertest, postedCase.id, patchedCase.comments![0].id);

        expect(comment).to.eql({});
      });
    });

    describe('unhappy path', () => {
      it('404s when comment belongs to different case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);
        const error = (await deleteComment(
          supertest,
          'fake-id',
          patchedCase.comments![0].id,
          404
        )) as Error;

        expect(error.message).to.be(
          `This comment ${patchedCase.comments![0].id} does not exist in fake-id.`
        );
      });

      it('404s when comment is not there', async () => {
        await deleteComment(supertest, 'fake-id', 'fake-id', 404);
      });

      it('should return a 400 when attempting to delete all comments when passing the `subCaseId` parameter', async () => {
        const { body } = await supertest
          .delete(`${CASES_URL}/case-id/comments?subCaseId=value`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
        // make sure the failure is because of the subCaseId
        expect(body.message).to.contain('disabled');
      });

      it('should return a 400 when attempting to delete a single comment when passing the `subCaseId` parameter', async () => {
        const { body } = await supertest
          .delete(`${CASES_URL}/case-id/comments/comment-id?subCaseId=value`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);
        // make sure the failure is because of the subCaseId
        expect(body.message).to.contain('disabled');
      });
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('sub case comments', () => {
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
            `${CASES_URL}/${caseInfo.id}/comments/${caseInfo.comments![0].id}?subCaseId=${
              caseInfo.subCases![0].id
            }`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        const { body } = await supertest.get(
          `${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`
        );

        expect(body.length).to.eql(0);
      });

      it('deletes all comments from a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        let { body: allComments } = await supertest.get(
          `${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`
        );
        expect(allComments.length).to.eql(2);

        await supertest
          .delete(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        ({ body: allComments } = await supertest.get(
          `${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`
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
