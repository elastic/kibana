/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import {
  AttributesTypeAlerts,
  AttributesTypeUser,
  CaseResponse,
  CommentType,
} from '../../../../../../plugins/cases/common/api';
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
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  updateComment,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
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

      expect(body.message).to.contain('disabled');
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
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      const updatedCase = await updateComment(supertest, postedCase.id, {
        id: patchedCase.comments![0].id,
        version: patchedCase.comments![0].version,
        comment: newComment,
        type: CommentType.user,
      });

      const userComment = updatedCase.comments![0] as AttributesTypeUser;
      expect(userComment.comment).to.eql(newComment);
      expect(userComment.type).to.eql(CommentType.user);
      expect(updatedCase.updated_by).to.eql(defaultUser);
    });

    it('should patch an alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentAlertReq);
      const updatedCase = await updateComment(supertest, postedCase.id, {
        id: patchedCase.comments![0].id,
        version: patchedCase.comments![0].version,
        type: CommentType.alert,
        alertId: 'new-id',
        index: postCommentAlertReq.index,
        rule: {
          id: 'id',
          name: 'name',
        },
      });

      const alertComment = updatedCase.comments![0] as AttributesTypeAlerts;
      expect(alertComment.alertId).to.eql('new-id');
      expect(alertComment.index).to.eql(postCommentAlertReq.index);
      expect(alertComment.type).to.eql(CommentType.alert);
      expect(alertComment.rule).to.eql({
        id: 'id',
        name: 'name',
      });
      expect(alertComment.updated_by).to.eql(defaultUser);
    });

    it('unhappy path - 404s when comment is not there', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await updateComment(
        supertest,
        postedCase.id,
        {
          id: 'id',
          version: 'version',
          type: CommentType.user,
          comment: 'comment',
        },
        404
      );
    });

    it('unhappy path - 404s when case is not there', async () => {
      await updateComment(
        supertest,
        'fake-id',
        {
          id: 'id',
          version: 'version',
          type: CommentType.user,
          comment: 'comment',
        },
        404
      );
    });

    it('unhappy path - 400s when trying to change comment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);

      await updateComment(
        supertest,
        postedCase.id,
        {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          type: CommentType.alert,
          alertId: 'test-id',
          index: 'test-index',
          rule: {
            id: 'id',
            name: 'name',
          },
        },
        400
      );
    });

    it('unhappy path - 400s when missing attributes for type user', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);

      await updateComment(
        supertest,
        postedCase.id,
        // @ts-expect-error
        {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
        },
        400
      );
    });

    it('unhappy path - 400s when adding excess attributes for type user', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);

      for (const attribute of ['alertId', 'index']) {
        await updateComment(
          supertest,
          postedCase.id,
          {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            comment: 'a comment',
            type: CommentType.user,
            [attribute]: attribute,
          },
          400
        );
      }
    });

    it('unhappy path - 400s when missing attributes for type alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentAlertReq);

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
        await updateComment(
          supertest,
          postedCase.id,
          // @ts-expect-error
          {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            ...requestAttributes,
          },
          400
        );
      }
    });

    it('unhappy path - 400s when adding excess attributes for type alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentAlertReq);

      for (const attribute of ['comment']) {
        await updateComment(
          supertest,
          postedCase.id,
          {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            type: CommentType.alert,
            index: 'test-index',
            alertId: 'test-id',
            rule: {
              id: 'id',
              name: 'name',
            },
            [attribute]: attribute,
          },
          400
        );
      }
    });

    it('unhappy path - 409s when conflict', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      await updateComment(
        supertest,
        postedCase.id,
        {
          id: patchedCase.comments![0].id,
          version: 'version-mismatch',
          type: CommentType.user,
          comment: newComment,
        },
        409
      );
    });

    describe('alert format', () => {
      type AlertComment = CommentType.alert | CommentType.generatedAlert;

      // ENABLE_CASE_CONNECTOR: once the case connector feature is completed create a test case for generated alerts here
      for (const [alertId, index, type] of [
        ['1', ['index1', 'index2'], CommentType.alert],
        [['1', '2'], 'index', CommentType.alert],
      ]) {
        it(`throws an error with an alert comment with contents id: ${alertId} indices: ${index} type: ${type}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          const patchedCase = await createComment(supertest, postedCase.id, postCommentAlertReq);

          await updateComment(
            supertest,
            patchedCase.id,
            {
              id: patchedCase.comments![0].id,
              version: patchedCase.comments![0].version,
              type: type as AlertComment,
              alertId,
              index,
              rule: postCommentAlertReq.rule,
            },
            400
          );
        });
      }

      for (const [alertId, index, type] of [
        ['1', ['index1'], CommentType.alert],
        [['1', '2'], ['index', 'other-index'], CommentType.alert],
      ]) {
        it(`does not throw an error with an alert comment with contents id: ${alertId} indices: ${index} type: ${type}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          const patchedCase = await createComment(supertest, postedCase.id, {
            ...postCommentAlertReq,
            alertId,
            index,
            type: type as AlertComment,
          });

          await updateComment(supertest, postedCase.id, {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            type: type as AlertComment,
            alertId,
            index,
            rule: postCommentAlertReq.rule,
          });
        });
      }
    });
  });
};
