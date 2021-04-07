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
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../../plugins/security_solution/common/constants';
import {
  CommentsResponse,
  CommentType,
  AttributesTypeUser,
  AttributesTypeAlerts,
} from '../../../../../../plugins/cases/common/api';
import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
  postCollectionReq,
  postCommentGenAlertReq,
} from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  deleteCases,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
} from '../../../../common/lib/utils';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllAlerts,
  getRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  getSignalsByIds,
  createRule,
  getQuerySignalIds,
} from '../../../../../detection_engine_api_integration/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('post_comment', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should post a comment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);
      const comment = patchedCase.comments![0] as AttributesTypeUser;

      expect(comment.type).to.eql(postCommentUserReq.type);
      expect(comment.comment).to.eql(postCommentUserReq.comment);
      expect(patchedCase.updated_by).to.eql(defaultUser);
    });

    it('should post an alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentAlertReq);
      const comment = patchedCase.comments![0] as AttributesTypeAlerts;

      expect(comment.type).to.eql(postCommentAlertReq.type);
      expect(comment.alertId).to.eql(postCommentAlertReq.alertId);
      expect(comment.index).to.eql(postCommentAlertReq.index);
      expect(patchedCase.updated_by).to.eql(defaultUser);
    });

    it('unhappy path - 400s when type is missing', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment(
        supertest,
        postedCase.id,
        {
          // @ts-expect-error
          bad: 'comment',
        },
        400
      );
    });

    it('unhappy path - 400s when missing attributes for type user', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment(
        supertest,
        postedCase.id,
        // @ts-expect-error
        {
          type: CommentType.user,
        },
        400
      );
    });

    it('unhappy path - 400s when adding excess attributes for type user', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      for (const attribute of ['alertId', 'index']) {
        await createComment(
          supertest,
          postedCase.id,
          {
            type: CommentType.user,
            [attribute]: attribute,
            comment: 'a comment',
          },
          400
        );
      }
    });

    it('unhappy path - 400s when missing attributes for type alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

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
        // @ts-expect-error
        await createComment(supertest, postedCase.id, requestAttributes, 400);
      }
    });

    it('unhappy path - 400s when adding excess attributes for type alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      for (const attribute of ['comment']) {
        await createComment(
          supertest,
          postedCase.id,
          {
            type: CommentType.alert,
            [attribute]: attribute,
            alertId: 'test-id',
            index: 'test-index',
            rule: {
              id: 'id',
              name: 'name',
            },
          },
          400
        );
      }
    });

    it('unhappy path - 400s when case is missing', async () => {
      await createComment(
        supertest,
        'not-exists',
        {
          // @ts-expect-error
          bad: 'comment',
        },
        400
      );
    });

    it('unhappy path - 400s when adding an alert to a closed case', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'closed',
            },
          ],
        })
        .expect(200);

      await createComment(supertest, postedCase.id, postCommentAlertReq, 400);
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    it.skip('400s when adding an alert to a collection case', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment(supertest, postedCase.id, postCommentAlertReq, 400);
    });

    it('400s when adding a generated alert to an individual case', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentGenAlertReq)
        .expect(400);
    });

    describe('alerts', () => {
      beforeEach(async () => {
        await esArchiver.load('auditbeat/hosts');
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('auditbeat/hosts');
      });

      it('should change the status of the alert if sync alert is on', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const postedCase = await createCase(supertest, postCaseReq);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signals = await getSignalsByIds(supertest, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source.signal.status).eql('open');

        await createComment(supertest, 'not-exists', {
          alertId: alert._id,
          index: alert._index,
          rule: {
            id: 'id',
            name: 'name',
          },
          type: CommentType.alert,
        });

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('in-progress');
      });

      it('should NOT change the status of the alert if sync alert is off', async () => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);

        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...postCaseReq, settings: { syncAlerts: false } })
          .expect(200);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: 'in-progress',
              },
            ],
          })
          .expect(200);

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signals = await getSignalsByIds(supertest, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source.signal.status).eql('open');

        await createComment(supertest, 'not-exists', {
          alertId: alert._id,
          index: alert._index,
          rule: {
            id: 'id',
            name: 'name',
          },
          type: CommentType.alert,
        });

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
      });
    });

    it('should return a 400 when passing the subCaseId', async () => {
      const { body } = await supertest
        .post(`${CASES_URL}/case-id/comments?subCaseId=value`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
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

      it('posts a new comment for a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        // create another sub case just to make sure we get the right comments
        await createSubCase({ supertest, actionID });
        await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        const { body: subCaseComments }: { body: CommentsResponse } = await supertest
          .get(`${CASES_URL}/${caseInfo.id}/comments/_find?subCaseId=${caseInfo.subCases![0].id}`)
          .send()
          .expect(200);
        expect(subCaseComments.total).to.be(2);
        expect(subCaseComments.comments[0].type).to.be(CommentType.generatedAlert);
        expect(subCaseComments.comments[1].type).to.be(CommentType.user);
      });
    });
  });
};
