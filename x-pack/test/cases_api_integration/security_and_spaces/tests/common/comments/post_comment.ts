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
  AttachmentType,
  UserCommentAttachmentAttributes,
  AlertAttachmentAttributes,
  CaseStatuses,
  ExternalReferenceSOAttachmentPayload,
  AlertAttachmentPayload,
  ExternalReferenceStorageType,
} from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
  getPostCaseRequest,
  getFilesAttachmentReq,
  fileAttachmentMetadata,
  fileMetadata,
  postCommentAlertMultipleIdsReq,
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
  findCaseUserActions,
  removeServerGeneratedPropertiesFromUserAction,
  getAllComments,
  bulkCreateAttachments,
} from '../../../../common/lib/api';
import {
  createAlertsIndex,
  deleteAllAlerts,
  deleteAllRules,
} from '../../../../../common/utils/security_solution';
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
          patchedCase.comments![0] as UserCommentAttachmentAttributes
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
          patchedCase.comments![0] as AlertAttachmentAttributes
        );

        expect(comment).to.eql({
          type: postCommentAlertReq.type,
          alertId: [postCommentAlertReq.alertId],
          index: [postCommentAlertReq.index],
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
        const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
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
          comment_id: patchedCase.comments![0].id,
          owner: 'securitySolutionFixture',
        });
      });

      describe('files', () => {
        it('should create a file attachment', async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest());

          const caseWithAttachments = await createComment({
            supertest,
            caseId: postedCase.id,
            params: getFilesAttachmentReq(),
          });

          const fileAttachment =
            caseWithAttachments.comments![0] as ExternalReferenceSOAttachmentPayload;

          expect(caseWithAttachments.totalComment).to.be(1);
          expect(fileAttachment.externalReferenceMetadata).to.eql(fileAttachmentMetadata);
        });
      });
    });

    describe('unhappy path', () => {
      describe('files', () => {
        it('400s when attempting to create a single file attachment with multiple file objects within it', async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest());

          const files = [fileMetadata(), fileMetadata()];

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: getFilesAttachmentReq({
              externalReferenceMetadata: {
                files,
              },
            }),
            expectedHttpCode: 400,
          });
        });

        it('should return a 400 when attaching a file with metadata that is missing the file field', async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest());

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: getFilesAttachmentReq({
              externalReferenceMetadata: {
                // intentionally structuring the data in a way that is invalid (using foo instead of files)
                foo: fileAttachmentMetadata.files,
              },
            }),
            expectedHttpCode: 400,
          });
        });

        it('should return a 400 when attaching a file with an empty metadata', async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest());

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: getFilesAttachmentReq({
              externalReferenceMetadata: {},
            }),
            expectedHttpCode: 400,
          });
        });
      });

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
            type: AttachmentType.user,
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when adding too long comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const longComment = Array(30001).fill('a').toString();

        await createComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          params: {
            comment: longComment,
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when adding empty comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          params: {
            comment: '',
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when adding a comment with only empty characters', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          params: {
            comment: '    ',
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
              type: AttachmentType.user,
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
          type: AttachmentType.alert,
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
              type: AttachmentType.alert,
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

      it('400s when attempting to add a persistable state to a case that already has 100', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const attachments = Array(100).fill({
          type: AttachmentType.externalReference as const,
          owner: 'securitySolutionFixture',
          externalReferenceAttachmentTypeId: '.test',
          externalReferenceId: 'so-id',
          externalReferenceMetadata: {},
          externalReferenceStorage: {
            soType: 'external-ref',
            type: ExternalReferenceStorageType.savedObject as const,
          },
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: attachments,
          expectedHttpCode: 200,
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            persistableStateAttachmentTypeId: '.test',
            persistableStateAttachmentState: {},
            type: AttachmentType.persistableState as const,
            owner: 'securitySolutionFixture',
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when attempting to add an external reference to a case that already has 100', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const attachments = Array(100).fill({
          persistableStateAttachmentTypeId: '.test',
          persistableStateAttachmentState: {},
          type: AttachmentType.persistableState as const,
          owner: 'securitySolutionFixture',
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: attachments,
          expectedHttpCode: 200,
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: AttachmentType.externalReference as const,
            owner: 'securitySolutionFixture',
            externalReferenceAttachmentTypeId: '.test',
            externalReferenceId: 'so-id',
            externalReferenceMetadata: {},
            externalReferenceStorage: {
              soType: 'external-ref',
              type: ExternalReferenceStorageType.savedObject as const,
            },
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('alerts', () => {
      describe('security_solution', () => {
        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
          await createAlertsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteAllAlerts(supertest, log, es);
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
              type: AttachmentType.alert,
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
            alertId: alert._id!,
            alertIndex: alert._index,
            expectedHttpCode: attachmentExpectedHttpCode,
            auth: attachmentAuth,
          });

          const updatedAlert = await getSecuritySolutionAlerts(supertest, [alert._id!]);

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
              alertId: alert._id!,
              alertIndex: alert._index,
            });
          }

          const updatedAlert = await getSecuritySolutionAlerts(supertest, [alert._id!]);
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
            alertId: alert._id!,
            alertIndex: alert._index,
          });

          const updatedAlertSecondTime = await getSecuritySolutionAlerts(supertest, [alert._id!]);
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
            alertId: alert._id!,
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
            alertId: alert._id!,
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
            alertId: alert._id!,
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
            alertId: alert._id!,
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
                type: AttachmentType.alert,
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

          expect(alert[ALERT_CASE_IDS]).eql(caseIds);

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
              type: AttachmentType.alert,
            },
          });

          const alert = await getAlertById({
            supertest,
            id: alertId,
            index: apmIndex,
            auth: { user: superUser, space: 'space1' },
          });

          expect(alert[ALERT_CASE_IDS]).eql([postedCase.id]);
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
              type: AttachmentType.alert,
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
              type: AttachmentType.alert,
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
              type: AttachmentType.alert,
            },
            auth: { user: obsSec, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      });
    });

    describe('alert format', () => {
      type AlertComment = AttachmentType.alert;

      for (const [alertId, index, type] of [
        ['1', ['index1', 'index2'], AttachmentType.alert],
        [['1', '2'], 'index', AttachmentType.alert],
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
        ['1', ['index1'], AttachmentType.alert],
        [['1', '2'], ['index', 'other-index'], AttachmentType.alert],
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

    describe('alert filtering', () => {
      it('not create a new attachment if the alert is already attached to the case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReq,
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReq,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(1);
      });

      it('should not create a new attachment if the alerts are already attached to the case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertMultipleIdsReq,
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertMultipleIdsReq,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(1);
      });

      it('should create a new attachment without alerts attached to the case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertMultipleIdsReq,
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            ...postCommentAlertMultipleIdsReq,
            alertId: ['test-id-1', 'test-id-2', 'test-id-3'],
            index: ['test-index-1', 'test-index-2', 'test-index-3'],
          },
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(2);

        const secondAttachment = attachments[1] as AlertAttachmentPayload;

        expect(secondAttachment.alertId).to.eql(['test-id-3']);
        expect(secondAttachment.index).to.eql(['test-index-3']);
      });
    });

    describe('partial updates', () => {
      it('should not result to a version conflict (409) when adding a comment to an updated case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        /**
         * Updating the status of the case will
         * change the version of the case
         */
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

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
          expectedHttpCode: 200,
        });
      });
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
