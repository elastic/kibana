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
  BulkCreateCommentRequest,
  CaseResponse,
  CaseStatuses,
  CommentType,
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
  createCase,
  removeServerGeneratedPropertiesFromSavedObject,
  superUserSpace1Auth,
  createCaseAndBulkCreateAttachments,
  bulkCreateAttachments,
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
  obsOnlyReadAlerts,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  secOnlyReadAlerts,
  secSolutionOnlyReadNoIndexAlerts,
  superUser,
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

  const validateComments = (
    comments: CaseResponse['comments'],
    attachments: BulkCreateCommentRequest
  ) => {
    comments?.forEach((attachment, index) => {
      const comment = removeServerGeneratedPropertiesFromSavedObject(attachment);

      expect(comment).to.eql({
        ...attachments[index],
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
      });
    });
  };

  describe('bulk_create_attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('creation', () => {
      it('should no create an attachment on empty request', async () => {
        const { theCase } = await createCaseAndBulkCreateAttachments({
          supertest,
          numberOfAttachments: 0,
        });

        expect(theCase.comments?.length).to.be(0);
      });

      it('should create one attachment', async () => {
        const { theCase, attachments } = await createCaseAndBulkCreateAttachments({
          supertest,
          numberOfAttachments: 1,
        });

        validateComments(theCase.comments, attachments);
      });

      it('should bulk create multiple attachments', async () => {
        const { theCase, attachments } = await createCaseAndBulkCreateAttachments({
          supertest,
        });

        expect(theCase.totalComment).to.eql(attachments.length);
        expect(theCase.updated_by).to.eql(defaultUser);

        validateComments(theCase.comments, attachments);
      });

      it('creates the correct user action', async () => {
        const { theCase, attachments } = await createCaseAndBulkCreateAttachments({
          supertest,
        });

        const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });

        userActions.slice(1).forEach((userAction, index) => {
          const userActionWithoutServerGeneratedAttributes =
            removeServerGeneratedPropertiesFromUserAction(userAction);

          expect(userActionWithoutServerGeneratedAttributes).to.eql({
            type: 'comment',
            action: 'create',
            created_by: defaultUser,
            payload: {
              comment: {
                ...attachments[index],
              },
            },
            case_id: theCase.id,
            comment_id: theCase.comments?.find((comment) => comment.id === userAction.comment_id)
              ?.id,
            owner: 'securitySolutionFixture',
          });
        });
      });
    });

    describe('errors', () => {
      it('400s when attempting to create a comment with a different owner than the case', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'securitySolutionFixture' })
        );

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: CommentType.user,
              comment: 'test',
              owner: 'securitySolutionFixture',
            },
            {
              type: CommentType.user,
              comment: 'test',
              owner: 'observabilityFixture',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when type is missing', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: CommentType.user,
              comment: 'test',
              owner: 'securitySolutionFixture',
            },
            {
              // @ts-expect-error
              bad: 'comment',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when missing attributes for type user', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: CommentType.user,
              comment: 'test',
              owner: 'securitySolutionFixture',
            },
            // @ts-expect-error
            {
              type: CommentType.user,
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when adding excess attributes for type user', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        for (const attribute of ['alertId', 'index']) {
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              {
                type: CommentType.user,
                comment: 'test',
                owner: 'securitySolutionFixture',
              },
              {
                type: CommentType.user,
                [attribute]: attribute,
                comment: 'a comment',
                owner: 'securitySolutionFixture',
              },
            ],
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
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              {
                type: CommentType.user,
                comment: 'test',
                owner: 'securitySolutionFixture',
              },
              // @ts-expect-error
              requestAttributes,
            ],
            expectedHttpCode: 400,
          });
        }
      });

      it('400s when adding excess attributes for type alert', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        for (const attribute of ['comment']) {
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              {
                type: CommentType.user,
                comment: 'test',
                owner: 'securitySolutionFixture',
              },
              {
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
            ],
            expectedHttpCode: 400,
          });
        }
      });

      it('404s when the case does not exist', async () => {
        await bulkCreateAttachments({
          supertest,
          caseId: 'not-exists',
          params: [
            {
              type: CommentType.user,
              comment: 'test',
              owner: 'securitySolutionFixture',
            },
          ],
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

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: CommentType.alert,
              alertId: 'test-id',
              index: 'test-index',
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when adding an alert with other attachments to a closed case', async () => {
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

        await createCaseAndBulkCreateAttachments({ supertest, expectedHttpCode: 400 });
      });

      it('400s when attempting to add more than 1K alerts to a case', async () => {
        const alerts = [...Array(1001).keys()].map((num) => `test-${num}`);
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              ...postCommentAlertReq,
              alertId: alerts,
              index: alerts,
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when attempting to add more than 1K alerts to a case in the same request', async () => {
        const alerts = [...Array(1001).keys()].map((num) => `test-${num}`);
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              ...postCommentAlertReq,
              alertId: alerts.slice(0, 500),
              index: alerts.slice(0, 500),
            },
            {
              ...postCommentAlertReq,
              alertId: alerts.slice(500, alerts.length),
              index: alerts.slice(500, alerts.length),
            },
            postCommentAlertReq,
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when attempting to add an alert to a case that already has 1K alerts', async () => {
        const alerts = [...Array(1000).keys()].map((num) => `test-${num}`);
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              ...postCommentAlertReq,
              alertId: alerts,
              index: alerts,
            },
          ],
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              ...postCommentAlertReq,
              alertId: 'test-id',
              index: 'test-index',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when the case already has alerts and the sum of existing and new alerts exceed 1k', async () => {
        const alerts = [...Array(1200).keys()].map((num) => `test-${num}`);
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              ...postCommentAlertReq,
              alertId: alerts.slice(0, 500),
              index: alerts.slice(0, 500),
            },
          ],
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              ...postCommentAlertReq,
              alertId: alerts.slice(500),
              index: alerts.slice(500),
            },
            postCommentAlertReq,
          ],
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

        const bulkCreateAttachmentsAndRefreshIndex = async ({
          caseId,
          alerts,
          expectedHttpCode = 200,
          auth = { user: superUser, space: null },
        }: {
          caseId: string;
          alerts: Array<{ id: string; index: string }>;
          expectedHttpCode?: number;
          auth?: { user: User; space: string | null };
        }) => {
          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId,
            params: alerts.map((alert) => ({
              alertId: alert.id,
              index: alert.index,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
              type: CommentType.alert,
            })),
            expectedHttpCode,
            auth,
          });

          await es.indices.refresh({ index: alerts.map((alert) => alert.index) });
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
            supertest,
            {
              ...postCaseReq,
              settings: { syncAlerts },
            },
            200,
            caseAuth
          );

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
            auth: caseAuth,
          });

          const signals = await createSecuritySolutionAlerts(supertest, log);

          const alerts: Array<{ id: string; index: string }> = [];
          const indices: string[] = [];
          const ids: string[] = [];

          signals.hits.hits.forEach((alert) => {
            expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql('open');

            alerts.push({
              id: alert._id,
              index: alert._index,
            });

            indices.push(alert._index);
            ids.push(alert._id);
          });

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts,
            auth: attachmentAuth,
            expectedHttpCode: attachmentExpectedHttpCode,
          });

          const updatedAlerts = await getSecuritySolutionAlerts(supertest, ids);

          updatedAlerts.hits.hits.forEach((alert) => {
            expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql(expectedAlertStatus);
          });
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
            await bulkCreateAttachmentsAndRefreshIndex({
              caseId: theCase.id,
              alerts: [{ id: alert._id, index: alert._index }],
            });
          }

          await es.indices.refresh({ index: alert._index });

          const updatedAlert = await getSecuritySolutionAlerts(supertest, [alert._id]);
          const caseIds = cases.map((theCase) => theCase.id);

          expect(updatedAlert.hits.hits[0]._source?.[ALERT_CASE_IDS]).eql(caseIds);

          return { updatedAlert, cases };
        };

        it('should change the status of the alerts if sync alert is on', async () => {
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

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id, index: alert._index }],
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

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id, index: alert._index }],
            expectedHttpCode: 400,
          });
        });

        it('should add the case ID to the alert schema when the user has read access only', async () => {
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

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id, index: alert._index }],
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

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id, index: alert._index }],
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

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id, index: alert._index }],
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
            await bulkCreateAttachments({
              supertest,
              caseId: theCase.id,
              params: [
                {
                  alertId,
                  index: apmIndex,
                  rule: {
                    id: 'id',
                    name: 'name',
                  },
                  owner: 'observabilityFixture',
                  type: CommentType.alert,
                },
              ],
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

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              {
                alertId,
                index: apmIndex,
                rule: {
                  id: 'id',
                  name: 'name',
                },
                owner: 'observabilityFixture',
                type: CommentType.alert,
              },
            ],
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

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              {
                alertId,
                index: apmIndex,
                rule: {
                  id: 'id',
                  name: 'name',
                },
                owner: 'securitySolutionFixture',
                type: CommentType.alert,
              },
            ],
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

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: [
              {
                alertId,
                index: apmIndex,
                rule: {
                  id: 'id',
                  name: 'name',
                },
                owner: 'observabilityFixture',
                type: CommentType.alert,
              },
            ],
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

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: [
              {
                alertId,
                index: apmIndex,
                rule: {
                  id: 'id',
                  name: 'name',
                },
                owner: 'observabilityFixture',
                type: CommentType.alert,
              },
            ],
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
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [{ ...postCommentAlertReq, alertId, index, type: type as AlertComment }],
            expectedHttpCode: 400,
          });
        });
      }

      it('does not throw an error with correct alert formatting', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const attachments = [
          {
            ...postCommentAlertReq,
            alertId: '1',
            index: ['index1'],
            type: CommentType.alert as const,
          },
          {
            ...postCommentAlertReq,
            alertId: ['1', '2'],
            index: ['index', 'other-index'],
            type: CommentType.alert as const,
          },
        ];

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: attachments,
          expectedHttpCode: 200,
        });
      });
    });

    describe('rbac', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should bulk create attachments when the user has the correct permissions for that owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        await bulkCreateAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: [postCommentUserReq],
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

        await bulkCreateAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: [{ ...postCommentUserReq, owner: 'observabilityFixture' }],
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

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: [postCommentUserReq],
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

        await bulkCreateAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: [postCommentUserReq],
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
