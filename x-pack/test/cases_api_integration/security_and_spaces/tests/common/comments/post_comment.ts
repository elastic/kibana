/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { ALERT_CASE_IDS, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';

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
  obsOnlyReadAlerts,
  obsSec,
  secOnlyReadAlerts,
  secSolutionOnlyReadNoIndexAlerts,
} from '../../../../common/lib/authentication/users';
import {
  getSecuritySolutionAlerts,
  createSecuritySolutionAlerts,
  getAlertById,
} from '../../../../common/lib/alerts';
import { User } from '../../../../common/lib/authentication/types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
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
      describe('security_solution', () => {
        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
          await createSignalsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteSignalsIndex(supertest, log);
          await deleteAllRules(supertest, log);
          await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        const createCommentAndRefreshIndex = async ({
          caseId,
          alertId,
          alertIndex,
          expectedHttpCode = 200,
          auth = { user: superUser, space: null },
        }: {
          caseId: string;
          alertId: string;
          alertIndex: string;
          expectedHttpCode?: number;
          auth?: { user: User; space: string | null };
        }) => {
          await createComment({
            supertest: supertestWithoutAuth,
            caseId,
            params: {
              alertId,
              index: alertIndex,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
              type: CommentType.alert,
            },
            expectedHttpCode,
            auth,
          });

          await es.indices.refresh({ index: alertIndex });
        };

        const bulkCreateAlertsAndVerifyAlertStatus = async ({
          syncAlerts,
          expectedAlertStatus,
          caseAuth,
          attachmentExpectedHttpCode,
          attachmentAuth,
        }: {
          syncAlerts: boolean;
          expectedAlertStatus: string;
          caseAuth?: { user: User; space: string | null };
          attachmentExpectedHttpCode?: number;
          attachmentAuth?: { user: User; space: string | null };
        }) => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            {
              ...postCaseReq,
              settings: { syncAlerts },
            },
            200,
            caseAuth
          );

          await updateCase({
            supertest: supertestWithoutAuth,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
            auth: caseAuth,
          });

          const signals = await createSecuritySolutionAlerts(supertest, log);

          const alert = signals.hits.hits[0];
          expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql('open');

          await createCommentAndRefreshIndex({
            caseId: postedCase.id,
            alertId: alert._id,
            alertIndex: alert._index,
            expectedHttpCode: attachmentExpectedHttpCode,
            auth: attachmentAuth,
          });

          const updatedAlert = await getSecuritySolutionAlerts(supertest, [alert._id]);

          expect(updatedAlert.hits.hits[0]._source?.[ALERT_WORKFLOW_STATUS]).eql(
            expectedAlertStatus
          );
        };

        const bulkCreateAlertsAndVerifyCaseIdsInAlertSchema = async (totalCases: number) => {
          const cases = await Promise.all(
            [...Array(totalCases).keys()].map((index) =>
              createCase(supertest, {
                ...postCaseReq,
                settings: { syncAlerts: false },
              })
            )
          );

          const signals = await createSecuritySolutionAlerts(supertest, log);
          const alert = signals.hits.hits[0];

          for (const theCase of cases) {
            await createCommentAndRefreshIndex({
              caseId: theCase.id,
              alertId: alert._id,
              alertIndex: alert._index,
            });
          }

          const updatedAlert = await getSecuritySolutionAlerts(supertest, [alert._id]);
          const caseIds = cases.map((theCase) => theCase.id);

          expect(updatedAlert.hits.hits[0]._source?.[ALERT_CASE_IDS]).eql(caseIds);

          return { updatedAlert, cases };
        };

        it('should change the status of the alert if sync alert is on', async () => {
          await bulkCreateAlertsAndVerifyAlertStatus({
            syncAlerts: true,
            expectedAlertStatus: 'acknowledged',
          });
        });

        it('should NOT change the status of the alert if sync alert is off', async () => {
          await bulkCreateAlertsAndVerifyAlertStatus({
            syncAlerts: false,
            expectedAlertStatus: 'open',
          });
        });

        it('should change the status of the alert when the user has write access to the indices and only read access to the siem solution', async () => {
          await bulkCreateAlertsAndVerifyAlertStatus({
            syncAlerts: true,
            expectedAlertStatus: 'acknowledged',
            caseAuth: {
              user: superUser,
              space: 'space1',
            },
            attachmentAuth: { user: secOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should NOT change the status of the alert when the user does NOT have access to the alert', async () => {
          await bulkCreateAlertsAndVerifyAlertStatus({
            syncAlerts: true,
            expectedAlertStatus: 'open',
            caseAuth: {
              user: superUser,
              space: 'space1',
            },
            attachmentExpectedHttpCode: 403,
            attachmentAuth: { user: obsSec, space: 'space1' },
          });
        });

        it('should NOT change the status of the alert when the user has read access to the kibana feature but no read access to the ES index', async () => {
          await bulkCreateAlertsAndVerifyAlertStatus({
            syncAlerts: true,
            expectedAlertStatus: 'open',
            caseAuth: {
              user: superUser,
              space: 'space1',
            },
            attachmentExpectedHttpCode: 500,
            attachmentAuth: { user: secSolutionOnlyReadNoIndexAlerts, space: 'space1' },
          });
        });

        it('should add the case ID to the alert schema', async () => {
          await bulkCreateAlertsAndVerifyCaseIdsInAlertSchema(1);
        });

        it('should add multiple case ids to the alert schema', async () => {
          await bulkCreateAlertsAndVerifyCaseIdsInAlertSchema(2);
        });

        it('should remove cases with the same ID from the case_ids alerts field', async () => {
          const { updatedAlert, cases } = await bulkCreateAlertsAndVerifyCaseIdsInAlertSchema(1);
          const postedCase = cases[0];
          const alert = updatedAlert.hits.hits[0];

          await createCommentAndRefreshIndex({
            caseId: postedCase.id,
            alertId: alert._id,
            alertIndex: alert._index,
          });

          const updatedAlertSecondTime = await getSecuritySolutionAlerts(supertest, [alert._id]);
          expect(updatedAlertSecondTime.hits.hits[0]._source?.[ALERT_CASE_IDS]).eql([
            postedCase.id,
          ]);
        });

        it('should not add more than 10 cases to an alert', async () => {
          const { updatedAlert } = await bulkCreateAlertsAndVerifyCaseIdsInAlertSchema(10);
          const alert = updatedAlert.hits.hits[0];

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            settings: { syncAlerts: false },
          });

          await createCommentAndRefreshIndex({
            caseId: postedCase.id,
            alertId: alert._id,
            alertIndex: alert._index,
            expectedHttpCode: 400,
          });
        });

        it('should add the case ID to the alert schema when the user has write access to the indices and only read access to the siem solution', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              settings: { syncAlerts: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          const signals = await createSecuritySolutionAlerts(supertest, log);
          const alert = signals.hits.hits[0];

          await createCommentAndRefreshIndex({
            caseId: postedCase.id,
            alertId: alert._id,
            alertIndex: alert._index,
            expectedHttpCode: 200,
            auth: { user: secOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should NOT add the case ID to the alert schema when the user does NOT have access to the alert', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              settings: { syncAlerts: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          const signals = await createSecuritySolutionAlerts(supertest, log);
          const alert = signals.hits.hits[0];

          await createCommentAndRefreshIndex({
            caseId: postedCase.id,
            alertId: alert._id,
            alertIndex: alert._index,
            expectedHttpCode: 403,
            auth: { user: obsSec, space: 'space1' },
          });
        });

        it('should add the case ID to the alert schema when the user has read access to the kibana feature but no read access to the ES index', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              settings: { syncAlerts: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          const signals = await createSecuritySolutionAlerts(supertest, log);
          const alert = signals.hits.hits[0];

          await createCommentAndRefreshIndex({
            caseId: postedCase.id,
            alertId: alert._id,
            alertIndex: alert._index,
            expectedHttpCode: 200,
            auth: { user: secSolutionOnlyReadNoIndexAlerts, space: 'space1' },
          });
        });
      });

      describe('observability', () => {
        const alertId = 'NoxgpHkBqbdrfX07MqXV';
        const apmIndex = '.alerts-observability.apm.alerts';

        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
        });

        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
        });

        const bulkCreateAlertsAndVerifyCaseIdsInAlertSchema = async (totalCases: number) => {
          const cases = await Promise.all(
            [...Array(totalCases).keys()].map((index) =>
              createCase(supertest, {
                ...postCaseReq,
                owner: 'observabilityFixture',
                settings: { syncAlerts: false },
              })
            )
          );

          for (const theCase of cases) {
            await createComment({
              supertest,
              caseId: theCase.id,
              params: {
                alertId,
                index: apmIndex,
                rule: {
                  id: 'id',
                  name: 'name',
                },
                owner: 'observabilityFixture',
                type: CommentType.alert,
              },
            });
          }

          const alert = await getAlertById({
            supertest,
            id: alertId,
            index: apmIndex,
            auth: { user: superUser, space: 'space1' },
          });

          const caseIds = cases.map((theCase) => theCase.id);

          expect(alert['kibana.alert.case_ids']).eql(caseIds);

          return { alert, cases };
        };

        it('should add the case ID to the alert schema', async () => {
          await bulkCreateAlertsAndVerifyCaseIdsInAlertSchema(1);
        });

        it('should add multiple case ids to the alert schema', async () => {
          await bulkCreateAlertsAndVerifyCaseIdsInAlertSchema(2);
        });

        it('should remove cases with the same ID from the case_ids alerts field', async () => {
          const { cases } = await bulkCreateAlertsAndVerifyCaseIdsInAlertSchema(1);
          const postedCase = cases[0];

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId,
              index: apmIndex,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'observabilityFixture',
              type: CommentType.alert,
            },
          });

          const alert = await getAlertById({
            supertest,
            id: alertId,
            index: apmIndex,
            auth: { user: superUser, space: 'space1' },
          });

          expect(alert['kibana.alert.case_ids']).eql([postedCase.id]);
        });

        it('should not add more than 10 cases to an alert', async () => {
          await bulkCreateAlertsAndVerifyCaseIdsInAlertSchema(10);

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            settings: { syncAlerts: false },
          });

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId,
              index: apmIndex,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'observabilityFixture',
              type: CommentType.alert,
            },
            expectedHttpCode: 400,
          });
        });

        it('should add the case ID to the alert schema when the user has read access only', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              owner: 'observabilityFixture',
              settings: { syncAlerts: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: {
              alertId,
              index: apmIndex,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'observabilityFixture',
              type: CommentType.alert,
            },
            auth: { user: obsOnlyReadAlerts, space: 'space1' },
            expectedHttpCode: 200,
          });
        });

        it('should NOT add the case ID to the alert schema when the user does NOT have access to the alert', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              owner: 'observabilityFixture',
              settings: { syncAlerts: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: {
              alertId,
              index: apmIndex,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'observabilityFixture',
              type: CommentType.alert,
            },
            auth: { user: obsSec, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
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
