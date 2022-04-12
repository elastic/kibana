/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../../plugins/security_solution/common/constants';
import {
  BulkCreateCommentRequest,
  CaseResponse,
  CaseStatuses,
  CommentRequest,
  CommentType,
} from '../../../../../../plugins/cases/common/api';
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
  getCaseUserActions,
  removeServerGeneratedPropertiesFromUserAction,
  removeServerGeneratedPropertiesFromSavedObject,
  superUserSpace1Auth,
  createCaseAndBulkCreateAttachments,
  bulkCreateAttachments,
  updateCase,
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
    });

    describe('alerts', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
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
        const attachments: CommentRequest[] = [];
        const indices: string[] = [];
        const ids: string[] = [];

        signals.hits.hits.forEach((alert) => {
          expect(alert._source?.[ALERT_WORKFLOW_STATUS]).eql('open');
          attachments.push({
            alertId: alert._id,
            index: alert._index,
            rule: {
              id: 'id',
              name: 'name',
            },
            owner: 'securitySolutionFixture',
            type: CommentType.alert,
          });

          indices.push(alert._index);
          ids.push(alert._id);
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: attachments,
        });

        await es.indices.refresh({ index: indices });

        const { body: updatedAlerts } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getQuerySignalIds(ids))
          .expect(200);

        updatedAlerts.hits.hits.forEach(
          (alert: { _source: { 'kibana.alert.workflow_status': string } }) => {
            expect(alert._source[ALERT_WORKFLOW_STATUS]).eql(expectedAlertStatus);
          }
        );
      };

      it('should change the status of the alerts if sync alert is on', async () => {
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
      const supertestWithoutAuth = getService('supertestWithoutAuth');

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
