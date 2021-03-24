/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { CaseResponse, CommentType } from '../../../../../../plugins/cases/common/api';
import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
} from '../../../../common/lib/mock';
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

  describe('patch_comment', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should return a 400 when the subCaseId parameter is passed', async () => {
      const { body } = await supertest
        .patch(`${CASES_URL}/case-id}/comments?subCaseId=value`)
        .set('kbn-xsrf', 'true')
        .send({
          id: 'id',
          version: 'version',
          type: CommentType.alert,
          alertId: 'test-id',
          index: 'test-index',
          rule: {
            id: 'id',
            name: 'name',
          },
        })
        .expect(400);

      expect(body.message).to.contain('subCaseId');
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

      it('patches a comment for a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        const { body: patchedSubCase }: { body: CaseResponse } = await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        const newComment = 'Well I decided to update my comment. So what? Deal with it.';
        const { body: patchedSubCaseUpdatedComment } = await supertest
          .patch(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send({
            id: patchedSubCase.comments![1].id,
            version: patchedSubCase.comments![1].version,
            comment: newComment,
            type: CommentType.user,
          })
          .expect(200);

        expect(patchedSubCaseUpdatedComment.comments.length).to.be(2);
        expect(patchedSubCaseUpdatedComment.comments[0].type).to.be(CommentType.generatedAlert);
        expect(patchedSubCaseUpdatedComment.comments[1].type).to.be(CommentType.user);
        expect(patchedSubCaseUpdatedComment.comments[1].comment).to.be(newComment);
      });

      it('fails to update the generated alert comment type', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        await supertest
          .patch(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send({
            id: caseInfo.comments![0].id,
            version: caseInfo.comments![0].version,
            type: CommentType.alert,
            alertId: 'test-id',
            index: 'test-index',
            rule: {
              id: 'id',
              name: 'name',
            },
          })
          .expect(400);
      });

      it('fails to update the generated alert comment by using another generated alert comment', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        await supertest
          .patch(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send({
            id: caseInfo.comments![0].id,
            version: caseInfo.comments![0].version,
            type: CommentType.generatedAlert,
            alerts: [{ _id: 'id1' }],
            index: 'test-index',
            rule: {
              id: 'id',
              name: 'name',
            },
          })
          .expect(400);
      });
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
        .send(postCommentUserReq)
        .expect(200);

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      const { body } = await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: patchedCase.comments[0].version,
          comment: newComment,
          type: CommentType.user,
        })
        .expect(200);

      expect(body.comments[0].comment).to.eql(newComment);
      expect(body.comments[0].type).to.eql('user');
      expect(body.updated_by).to.eql(defaultUser);
    });

    it('should patch an alert', async () => {
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

      const { body } = await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: patchedCase.comments[0].version,
          type: CommentType.alert,
          alertId: 'new-id',
          index: postCommentAlertReq.index,
          rule: {
            id: 'id',
            name: 'name',
          },
        })
        .expect(200);

      expect(body.comments[0].alertId).to.eql('new-id');
      expect(body.comments[0].index).to.eql(postCommentAlertReq.index);
      expect(body.comments[0].type).to.eql('alert');
      expect(body.updated_by).to.eql(defaultUser);
    });

    it('unhappy path - 404s when comment is not there', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: 'id',
          version: 'version',
          type: CommentType.user,
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
          type: CommentType.user,
          comment: 'comment',
        })
        .expect(404);
    });

    it('unhappy path - 400s when trying to change comment type', async () => {
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

      await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: patchedCase.comments[0].version,
          type: CommentType.alert,
          alertId: 'test-id',
          index: 'test-index',
          rule: {
            id: 'id',
            name: 'name',
          },
        })
        .expect(400);
    });

    it('unhappy path - 400s when missing attributes for type user', async () => {
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

      await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: patchedCase.comments[0].version,
        })
        .expect(400);
    });

    it('unhappy path - 400s when adding excess attributes for type user', async () => {
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

      for (const attribute of ['alertId', 'index']) {
        await supertest
          .patch(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            id: patchedCase.comments[0].id,
            version: patchedCase.comments[0].version,
            comment: 'a comment',
            type: CommentType.user,
            [attribute]: attribute,
          })
          .expect(400);
      }
    });

    it('unhappy path - 400s when missing attributes for type alert', async () => {
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

      const allRequestAttributes = {
        type: CommentType.alert,
        index: 'test-index',
        alertId: 'test-id',
        rule: {
          id: 'id',
          name: 'name',
        },
      };

      for (const attribute of ['alertId', 'index']) {
        const requestAttributes = omit(attribute, allRequestAttributes);
        await supertest
          .patch(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            id: patchedCase.comments[0].id,
            version: patchedCase.comments[0].version,
            ...requestAttributes,
          })
          .expect(400);
      }
    });

    it('unhappy path - 400s when adding excess attributes for type alert', async () => {
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

      for (const attribute of ['comment']) {
        await supertest
          .patch(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            id: patchedCase.comments[0].id,
            version: patchedCase.comments[0].version,
            type: CommentType.alert,
            index: 'test-index',
            alertId: 'test-id',
            rule: {
              id: 'id',
              name: 'name',
            },
            [attribute]: attribute,
          })
          .expect(400);
      }
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
        .send(postCommentUserReq)
        .expect(200);

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: 'version-mismatch',
          type: CommentType.user,
          comment: newComment,
        })
        .expect(409);
    });
  });
};
