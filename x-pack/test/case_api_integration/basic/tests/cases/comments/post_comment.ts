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
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../../plugins/security_solution/common/constants';
import { CommentsResponse, CommentType } from '../../../../../../plugins/cases/common/api';
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
        .send({ type: CommentType.user })
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
          .send({ type: CommentType.user, [attribute]: attribute, comment: 'a comment' })
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
          .send({
            type: CommentType.alert,
            [attribute]: attribute,
            alertId: 'test-id',
            index: 'test-index',
            rule: {
              id: 'id',
              name: 'name',
            },
          })
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

    it('unhappy path - 400s when adding an alert to a closed case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

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

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentAlertReq)
        .expect(400);
    });

    it('400s when adding an alert to a collection case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCollectionReq)
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentAlertReq)
        .expect(400);
    });

    it('400s when adding a generated alert to an individual case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

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

        const { body: postedCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
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

        await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            alertId: alert._id,
            index: alert._index,
            rule: {
              id: 'id',
              name: 'name',
            },
            type: CommentType.alert,
          })
          .expect(200);

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

        await supertest
          .post(`${CASES_URL}/${postedCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            alertId: alert._id,
            index: alert._index,
            rule: {
              id: 'id',
              name: 'name',
            },
            type: CommentType.alert,
          })
          .expect(200);

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
      });
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
