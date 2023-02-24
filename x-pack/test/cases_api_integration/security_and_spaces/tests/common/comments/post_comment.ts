/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  CommentType,
  AttributesTypeUser,
  AttributesTypeAlerts,
  CaseStatuses,
} from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  removeServerGeneratedPropertiesFromSavedObject,
  superUserSpace1Auth,
  updateCase,
  getCaseUserActions,
  removeServerGeneratedPropertiesFromUserAction,
} from '../../../../common/lib/api';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllRules,
  getRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  getSignalsByIds,
  createRule,
  getQuerySignalIds,
} from '../../../../../detection_engine_api_integration/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('post_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    describe('happy path', () => {
      it('should post a comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const comment = removeServerGeneratedPropertiesFromSavedObject(
          patchedCase.comments![0] as AttributesTypeUser
        );

        expect(comment).to.eql({
          type: postCommentUserReq.type,
          comment: postCommentUserReq.comment,
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
          owner: 'securitySolutionFixture',
        });

        // updates the case correctly after adding a comment
        expect(patchedCase.totalComment).to.eql(patchedCase.comments!.length);
        expect(patchedCase.updated_by).to.eql(defaultUser);
      });

      it('should post an alert', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReq,
        });
        const comment = removeServerGeneratedPropertiesFromSavedObject(
          patchedCase.comments![0] as AttributesTypeAlerts
        );

        expect(comment).to.eql({
          type: postCommentAlertReq.type,
          alertId: postCommentAlertReq.alertId,
          index: postCommentAlertReq.index,
          rule: postCommentAlertReq.rule,
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
          owner: 'securitySolutionFixture',
        });

        // updates the case correctly after adding a comment
        expect(patchedCase.totalComment).to.eql(patchedCase.comments!.length);
        expect(patchedCase.updated_by).to.eql(defaultUser);
      });

      it('creates a user action', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const commentUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);

        expect(commentUserAction).to.eql({
          type: 'comment',
          action: 'create',
          created_by: defaultUser,
          payload: {
            comment: {
              comment: postCommentUserReq.comment,
              type: postCommentUserReq.type,
              owner: 'securitySolutionFixture',
            },
          },
          case_id: postedCase.id,
          comment_id: patchedCase.comments![0].id,
          owner: 'securitySolutionFixture',
        });
      });
    });

    describe('unhappy path', () => {
      it('400s when attempting to create a comment with a different owner than the case', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'securitySolutionFixture' })
        );

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: { ...postCommentUserReq, owner: 'observabilityFixture' },
          expectedHttpCode: 400,
        });
      });

      it('400s when type is missing', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            // @ts-expect-error
            bad: 'comment',
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when missing attributes for type user', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          params: {
            type: CommentType.user,
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when adding excess attributes for type user', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        for (const attribute of ['alertId', 'index']) {
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              type: CommentType.user,
              [attribute]: attribute,
              comment: 'a comment',
              owner: 'securitySolutionFixture',
            },
            expectedHttpCode: 400,
          });
        }
      });

      it('400s when missing attributes for type alert', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const allRequestAttributes = {
          type: CommentType.alert,
          index: 'test-index',
          alertId: 'test-id',
          rule: {
            id: 'id',
            name: 'name',
          },
          owner: 'securitySolutionFixture',
        };

        for (const attribute of ['alertId', 'index']) {
          const requestAttributes = omit(attribute, allRequestAttributes);
          await createComment({
            supertest,
            caseId: postedCase.id,
            // @ts-expect-error
            params: requestAttributes,
            expectedHttpCode: 400,
          });
        }
      });

      it('400s when adding excess attributes for type alert', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        for (const attribute of ['comment']) {
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              type: CommentType.alert,
              [attribute]: attribute,
              alertId: 'test-id',
              index: 'test-index',
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
            },
            expectedHttpCode: 400,
          });
        }
      });

      it('404s when the case does not exist', async () => {
        await createComment({
          supertest,
          caseId: 'not-exists',
          params: postCommentUserReq,
          expectedHttpCode: 404,
        });
      });

      it('400s when adding an alert to a closed case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
              },
            ],
          },
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReq,
          expectedHttpCode: 400,
        });
      });

      it('400s when attempting to add more than 1K alerts to a case', async () => {
        const alerts = [...Array(1001).keys()].map((num) => `test-${num}`);
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: { ...postCommentAlertReq, alertId: alerts, index: alerts },
          expectedHttpCode: 400,
        });
      });

      it('400s when attempting to add an alert to a case that already has 1K alerts', async () => {
        const alerts = [...Array(1000).keys()].map((num) => `test-${num}`);
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: { ...postCommentAlertReq, alertId: alerts, index: alerts },
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: { ...postCommentAlertReq, alertId: 'test-id', index: 'test-index' },
          expectedHttpCode: 400,
        });
      });

      it('400s when the case already has alerts and the sum of existing and new alerts exceed 1k', async () => {
        const alerts = [...Array(1200).keys()].map((num) => `test-${num}`);
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            ...postCommentAlertReq,
            alertId: alerts.slice(0, 500),
            index: alerts.slice(0, 500),
          },
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            ...postCommentAlertReq,
            alertId: alerts.slice(500),
            index: alerts.slice(500),
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('alerts', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllRules(supertest, log);
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      const bulkCreateAlertsAndVerifyAlertStatus = async (
        syncAlerts: boolean,
        expectedAlertStatus: string
      ) => {
        const rule = getRuleForSignalTesting(['auditbeat-*']);
        const postedCase = await createCase(supertest, {
          ...postCaseReq,
          settings: { syncAlerts },
        });

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses['in-progress'],
              },
            ],
          },
        });

        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signals = await getSignalsByIds(supertest, log, [id]);

        const alert = signals.hits.hits[0];
        expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql('open');

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            alertId: alert._id,
            index: alert._index,
            rule: {
              id: 'id',
              name: 'name',
            },
            owner: 'securitySolutionFixture',
            type: CommentType.alert,
          },
        });

        await es.indices.refresh({ index: alert._index });

        const { body: updatedAlert } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds([alert._id]))
          .expect(200);

        expect(updatedAlert.hits.hits[0]._source[ALERT_WORKFLOW_STATUS]).eql(expectedAlertStatus);
      };

      it('should change the status of the alert if sync alert is on', async () => {
        await bulkCreateAlertsAndVerifyAlertStatus(true, 'acknowledged');
      });

      it('should NOT change the status of the alert if sync alert is off', async () => {
        await bulkCreateAlertsAndVerifyAlertStatus(false, 'open');
      });
    });

    describe('alert format', () => {
      type AlertComment = CommentType.alert;

      for (const [alertId, index, type] of [
        ['1', ['index1', 'index2'], CommentType.alert],
        [['1', '2'], 'index', CommentType.alert],
      ]) {
        it(`throws an error with an alert comment with contents id: ${alertId} indices: ${index} type: ${type}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: { ...postCommentAlertReq, alertId, index, type: type as AlertComment },
            expectedHttpCode: 400,
          });
        });
      }

      for (const [alertId, index, type] of [
        ['1', ['index1'], CommentType.alert],
        [['1', '2'], ['index', 'other-index'], CommentType.alert],
      ]) {
        it(`does not throw an error with an alert comment with contents id: ${alertId} indices: ${index} type: ${type}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              ...postCommentAlertReq,
              alertId,
              index,
              type: type as AlertComment,
            },
            expectedHttpCode: 200,
          });
        });
      }
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should create a comment when the user has the correct permissions for that owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space1' },
        });
      });

      it('should not create a comment when the user does not have permissions for that owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          { user: obsOnly, space: 'space1' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: { ...postCommentUserReq, owner: 'observabilityFixture' },
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should not create a comment`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            superUserSpace1Auth
          );

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should not create a comment in a space the user does not have permissions for', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
