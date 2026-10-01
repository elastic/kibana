/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { ALERT_CASE_IDS, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';

import type { Case } from '@kbn/cases-plugin/common';
import {
  AttachmentType,
  COMMENT_ATTACHMENT_TYPE,
  OSQUERY_ATTACHMENT_TYPE,
  isUnifiedCommentAttachment,
} from '@kbn/cases-plugin/common';
import { MAX_COMMENT_LENGTH } from '@kbn/cases-plugin/common/constants';
import type { AttachmentRequestV2 } from '@kbn/cases-plugin/common/types/api';
import type {
  UnifiedAttachmentPayload,
  UnifiedReferenceAttachmentPayload,
} from '@kbn/cases-plugin/common/types/domain';
import { CaseStatuses, ExternalReferenceStorageType } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/ftr_provider_context';
import {
  defaultUser,
  postCaseReq,
  getPostCaseRequest,
  fileAttachmentMetadata,
  fileMetadata,
  userActionSourceApi,
  postCommentAlertReq,
  postCommentAlertMultipleIdsReq,
  postCommentUserReq,
  buildUnifiedAlertReq,
  getUnifiedFilesAttachmentReq,
  postUnifiedActionsReq,
  postUnifiedAlertMultipleIdsReq,
  postUnifiedAlertReq,
  postUnifiedCommentReq,
} from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  removeServerGeneratedPropertiesFromSavedObject,
  superUserSpace1Auth,
  createCaseAndBulkCreateAttachments,
  bulkCreateAttachments,
  getUnifiedAttachments,
  updateCase,
  findCaseUserActions,
  removeServerGeneratedPropertiesFromUserAction,
  createAndUploadFile,
  deleteAllFiles,
  getAllComments,
  createComment,
  getCaseSavedObjectsFromES,
} from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/api';
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
} from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/authentication/users';
import { getAlertById } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/alerts';
import type { User } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/authentication/types';
import { SECURITY_SOLUTION_FILE_KIND } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/constants';
import { arraysToEqual } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/validation';
import {
  createAlertsIndex,
  deleteAllAlerts,
  deleteAllRules,
} from '@kbn/detections-response-ftr-services';
import {
  getSecuritySolutionAlerts,
  createSecuritySolutionAlerts,
} from '../../../../common/lib/alerts';

// Any non-file attachment type works here; the file-limit tests only need one alongside the files.
const unifiedOtherAttachmentReq = {
  type: OSQUERY_ATTACHMENT_TYPE,
  attachmentId: 'osquery-1',
  metadata: { agentIds: ['agent-1'], queryId: 'query-1' },
  owner: 'securitySolutionFixture',
};

// User actions persist the legacy shape, regardless of the unified shape sent on the wire.
const toLegacyUserActionPayload = (attachment: UnifiedAttachmentPayload) => {
  if (isUnifiedCommentAttachment(attachment)) {
    return { type: 'user', comment: attachment.data.content, owner: attachment.owner };
  }

  const { attachmentId, metadata, owner } = attachment as UnifiedReferenceAttachmentPayload;
  return {
    type: 'alert',
    alertId: attachmentId,
    index: metadata?.index,
    rule: metadata?.rule,
    owner,
  };
};

// `getAllComments` reads through the cases_fixture route, which projects to the legacy shape.
const legacyAlertCommentOnlyId3 = {
  ...postCommentAlertMultipleIdsReq,
  alertId: ['test-id-3'],
  index: ['test-index-3'],
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const validateCommentsIgnoringOrder = (
    comments: Case['comments'],
    attachments: AttachmentRequestV2[]
  ) => {
    expect(comments?.length).to.eql(attachments.length);

    const commentsWithoutGeneratedProps = [];
    const attachmentsWithoutGeneratedProps = [];

    for (const comment of comments!) {
      commentsWithoutGeneratedProps.push(removeServerGeneratedPropertiesFromSavedObject(comment));
    }

    for (const attachment of attachments) {
      attachmentsWithoutGeneratedProps.push({
        ...attachment,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
      });
    }

    expect(arraysToEqual(commentsWithoutGeneratedProps, attachmentsWithoutGeneratedProps)).to.be(
      true
    );
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

        validateCommentsIgnoringOrder(theCase.comments, attachments);
      });

      it('should bulk create multiple attachments', async () => {
        const { theCase, attachments } = await createCaseAndBulkCreateAttachments({
          supertest,
        });

        expect(theCase.totalComment).to.eql(attachments.length);
        expect(theCase.updated_by).to.eql(defaultUser);

        validateCommentsIgnoringOrder(theCase.comments, attachments);
      });

      it('creates the correct user action', async () => {
        const { theCase, attachments } = await createCaseAndBulkCreateAttachments({
          supertest,
        });

        const { userActions } = await findCaseUserActions({ supertest, caseID: theCase.id });

        userActions.slice(1).forEach((userAction, index) => {
          const userActionWithoutServerGeneratedAttributes =
            removeServerGeneratedPropertiesFromUserAction(userAction);

          expect(userActionWithoutServerGeneratedAttributes).to.eql({
            type: 'comment',
            action: 'create',
            created_by: defaultUser,
            payload: {
              comment: toLegacyUserActionPayload(attachments[index]),
            },
            comment_id: theCase.comments?.find((comment) => comment.id === userAction.comment_id)
              ?.id,
            owner: 'securitySolutionFixture',
            source: userActionSourceApi,
          });
        });
      });

      describe('files', () => {
        it('should bulk create multiple file attachments', async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest());

          const caseWithAttachments = await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [getUnifiedFilesAttachmentReq(), getUnifiedFilesAttachmentReq()],
          });

          const firstFileAttachment = caseWithAttachments.comments![0] as unknown as {
            metadata: { files: unknown[] };
          };
          const secondFileAttachment = caseWithAttachments.comments![1] as unknown as {
            metadata: { files: unknown[] };
          };

          expect(caseWithAttachments.totalComment).to.be(2);
          expect(firstFileAttachment.metadata.files).to.eql(fileAttachmentMetadata.files);
          expect(secondFileAttachment.metadata.files).to.eql(fileAttachmentMetadata.files);
        });

        it('should bulk create 100 file attachments', async () => {
          const fileRequests = [...Array(100).keys()].map(() => getUnifiedFilesAttachmentReq());

          const postedCase = await createCase(supertest, postCaseReq);
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: fileRequests,
          });
        });

        it('should bulk create 100 file attachments when there is another attachment type already associated with the case', async () => {
          const fileRequests = [...Array(100).keys()].map(() => getUnifiedFilesAttachmentReq());

          const postedCase = await createCase(supertest, postCaseReq);
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [unifiedOtherAttachmentReq],
          });

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: fileRequests,
          });
        });

        it('should bulk create 99 file attachments when the case has a file associated to it', async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolution' }),
            200,
            { user: superUser, space: null }
          );

          await createAndUploadFile({
            supertest: supertestWithoutAuth,
            createFileParams: {
              name: 'testfile',
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedCase.id],
                owner: [postedCase.owner],
              },
            },
            data: 'abc',
            auth: { user: superUser, space: null },
          });

          const fileRequests = [...Array(99).keys()].map(() =>
            getUnifiedFilesAttachmentReq({ owner: 'securitySolution' })
          );

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: fileRequests,
            auth: { user: superUser, space: null },
            expectedHttpCode: 200,
          });
        });
      });
    });

    describe('errors', () => {
      describe('files', () => {
        afterEach(async () => {
          await deleteAllFiles({
            supertest,
          });
        });

        it('should return a 400 when attempting to create 100 file attachments when a file associated to the case exists', async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolution' }),
            200,
            { user: superUser, space: null }
          );

          await createAndUploadFile({
            supertest: supertestWithoutAuth,
            createFileParams: {
              name: 'testfile',
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedCase.id],
                owner: [postedCase.owner],
              },
            },
            data: 'abc',
            auth: { user: superUser, space: null },
          });

          const fileRequests = [...Array(100).keys()].map(() =>
            getUnifiedFilesAttachmentReq({ owner: 'securitySolution' })
          );

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: fileRequests,
            auth: { user: superUser, space: null },
            expectedHttpCode: 400,
          });
        });

        it('400s when attempting to create a single file attachment with multiple file objects within it', async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest());

          const files = [fileMetadata(), fileMetadata()];

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              getUnifiedFilesAttachmentReq({
                metadata: { files, soType: FILE_SO_TYPE },
              }),
            ],
            expectedHttpCode: 400,
          });
        });

        it('400s when attaching a file with metadata that is missing the file field', async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest());

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              postUnifiedCommentReq,
              getUnifiedFilesAttachmentReq({
                metadata: {
                  // intentionally structure the data in a way that is invalid
                  food: fileAttachmentMetadata.files,
                  soType: FILE_SO_TYPE,
                },
              }),
            ],
            expectedHttpCode: 400,
          });
        });

        it('should return a 400 when attaching a file with an empty metadata', async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest());

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              getUnifiedFilesAttachmentReq({
                metadata: {},
              }),
            ],
            expectedHttpCode: 400,
          });
        });

        it('400s when attempting to add more than 100 files to a case', async () => {
          const fileRequests = [...Array(101).keys()].map(() => getUnifiedFilesAttachmentReq());
          const postedCase = await createCase(supertest, postCaseReq);
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: fileRequests,
            expectedHttpCode: 400,
          });
        });
      });

      it('400s when attempting to add more than 100 attachments', async () => {
        const attachments = Array(101).fill(postUnifiedCommentReq);

        await bulkCreateAttachments({
          supertest,
          caseId: 'test-case-id',
          params: attachments,
          expectedHttpCode: 400,
        });
      });

      it('400s when attempting to create a comment with a different owner than the case', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'securitySolutionFixture' })
        );

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            postUnifiedCommentReq,
            { ...postUnifiedCommentReq, owner: 'observabilityFixture' },
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
            postUnifiedCommentReq,
            {
              // @ts-expect-error
              bad: 'comment',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when missing attributes for type comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            postUnifiedCommentReq,
            // @ts-expect-error
            {
              type: COMMENT_ATTACHMENT_TYPE,
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when comment is too long', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              ...postUnifiedCommentReq,
              data: { content: 'x'.repeat(MAX_COMMENT_LENGTH + 1) },
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when adding excess attributes for type comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        for (const attribute of ['alertId', 'index']) {
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              postUnifiedCommentReq,
              {
                ...postUnifiedCommentReq,
                [attribute]: attribute,
              },
            ],
            expectedHttpCode: 400,
          });
        }
      });

      it('400s when missing attributes for type alert', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        // Unified alerts allow a missing `metadata.index`, so the index case uses the legacy shape.
        const requests = [
          omit('attachmentId', postUnifiedAlertReq),
          omit('index', postCommentAlertReq),
        ];

        for (const requestAttributes of requests) {
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              postUnifiedCommentReq,
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
              postUnifiedCommentReq,
              {
                ...postUnifiedAlertReq,
                [attribute]: attribute,
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
          params: [postUnifiedCommentReq],
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
          params: [postUnifiedAlertReq],
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

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: getUnifiedAttachments(3),
          expectedHttpCode: 400,
        });
      });

      describe('validation', () => {
        it('400s when attempting to add more than 1K alerts to a case', async () => {
          const alerts = [...Array(1001).keys()].map((num) => `test-${num}`);
          const postedCase = await createCase(supertest, postCaseReq);
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              buildUnifiedAlertReq('securitySolutionFixture', { alertId: alerts, index: alerts }),
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
              buildUnifiedAlertReq('securitySolutionFixture', {
                alertId: alerts.slice(0, 500),
                index: alerts.slice(0, 500),
              }),
              buildUnifiedAlertReq('securitySolutionFixture', {
                alertId: alerts.slice(500, alerts.length),
                index: alerts.slice(500, alerts.length),
              }),
              postUnifiedAlertReq,
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
              buildUnifiedAlertReq('securitySolutionFixture', { alertId: alerts, index: alerts }),
            ],
          });

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              buildUnifiedAlertReq('securitySolutionFixture', {
                alertId: 'test-id',
                index: 'test-index',
              }),
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
              buildUnifiedAlertReq('securitySolutionFixture', {
                alertId: alerts.slice(0, 500),
                index: alerts.slice(0, 500),
              }),
            ],
          });

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              buildUnifiedAlertReq('securitySolutionFixture', {
                alertId: alerts.slice(500),
                index: alerts.slice(500),
              }),
              postUnifiedAlertReq,
            ],
            expectedHttpCode: 400,
          });
        });

        // Skipped pending the attachment-cap redesign: these rely on a custom `.test` ER/PS subtype to
        // reach MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES (100), which no longer exists once the
        // ER/PS registries are removed. Re-enable when the cap is revisited (UNIFIED_ATTACHMENT_PLAN "Deferred").
        it.skip('400s when attempting to bulk create persistable state attachments reaching the 100 limit', async () => {
          const postedCase = await createCase(supertest, postCaseReq);

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              type: AttachmentType.externalReference,
              owner: 'securitySolutionFixture',
              externalReferenceAttachmentTypeId: '.test',
              externalReferenceId: 'so-id',
              externalReferenceMetadata: {},
              externalReferenceStorage: {
                soType: 'external-ref',
                type: ExternalReferenceStorageType.savedObject,
              },
            },
            expectedHttpCode: 200,
          });

          const persistableStateAttachments = Array(100).fill({
            persistableStateAttachmentTypeId: '.test',
            persistableStateAttachmentState: {},
            type: AttachmentType.persistableState,
            owner: 'securitySolutionFixture',
          });

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: persistableStateAttachments,
            expectedHttpCode: 400,
          });
        });

        // Skipped pending the attachment-cap redesign (see the sibling persistable-state limit test above).
        it.skip('400s when attempting to bulk create >100 external reference attachments reaching the 100 limit', async () => {
          const postedCase = await createCase(supertest, postCaseReq);

          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              persistableStateAttachmentTypeId: '.test',
              persistableStateAttachmentState: {},
              type: AttachmentType.persistableState,
              owner: 'securitySolutionFixture',
            },
            expectedHttpCode: 200,
          });

          const externalRequestAttachments = Array(100).fill({
            type: AttachmentType.externalReference,
            owner: 'securitySolutionFixture',
            externalReferenceAttachmentTypeId: '.test',
            externalReferenceId: 'so-id',
            externalReferenceMetadata: {},
            externalReferenceStorage: {
              soType: 'external-ref',
              type: ExternalReferenceStorageType.savedObject,
            },
          });

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: externalRequestAttachments,
            expectedHttpCode: 400,
          });
        });
      });
    });

    describe('alerts', () => {
      describe('security_solution', () => {
        beforeEach(async () => {
          await esArchiver.load('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
          await createAlertsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);
          await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
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
            params: alerts.map((alert) =>
              buildUnifiedAlertReq('securitySolutionFixture', {
                alertId: alert.id,
                index: alert.index,
              })
            ),
            expectedHttpCode,
            auth,
          });

          await es.indices.refresh({ index: alerts.map((alert) => alert.index) });
        };

        const bulkCreateAlertsAndVerifyAlertStatus = async ({
          syncAlerts,
          extractObservables,
          expectedAlertStatus,
          caseAuth,
          attachmentExpectedHttpCode,
          attachmentAuth,
        }: {
          syncAlerts: boolean;
          extractObservables: boolean;
          expectedAlertStatus: string;
          caseAuth?: { user: User; space: string | null };
          attachmentExpectedHttpCode?: number;
          attachmentAuth?: { user: User; space: string | null };
        }) => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              settings: { syncAlerts, extractObservables },
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
              id: alert._id!,
              index: alert._index,
            });

            indices.push(alert._index);
            ids.push(alert._id!);
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
                settings: { syncAlerts: false, extractObservables: false },
              })
            )
          );

          const signals = await createSecuritySolutionAlerts(supertest, log);
          const alert = signals.hits.hits[0];

          for (const theCase of cases) {
            await bulkCreateAttachmentsAndRefreshIndex({
              caseId: theCase.id,
              alerts: [{ id: alert._id!, index: alert._index }],
            });
          }

          await es.indices.refresh({ index: alert._index });

          const updatedAlert = await getSecuritySolutionAlerts(supertest, [alert._id!]);
          const caseIds = cases.map((theCase) => theCase.id);

          expect(updatedAlert.hits.hits[0]._source?.[ALERT_CASE_IDS]).eql(caseIds);

          return { updatedAlert, cases };
        };

        it('should change the status of the alerts if sync alert is on', async () => {
          await bulkCreateAlertsAndVerifyAlertStatus({
            syncAlerts: true,
            extractObservables: true,
            expectedAlertStatus: 'acknowledged',
          });
        });

        it('should NOT change the status of the alert if sync alert is off', async () => {
          await bulkCreateAlertsAndVerifyAlertStatus({
            syncAlerts: false,
            extractObservables: false,
            expectedAlertStatus: 'open',
          });
        });

        it('should change the status of the alert when the user has write access to the indices and only read access to the siem solution', async () => {
          await bulkCreateAlertsAndVerifyAlertStatus({
            syncAlerts: true,
            extractObservables: true,
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
            extractObservables: true,
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
            extractObservables: true,
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
            alerts: [{ id: alert._id!, index: alert._index }],
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
            settings: { syncAlerts: false, extractObservables: false },
          });

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id!, index: alert._index }],
            expectedHttpCode: 400,
          });
        });

        it('should add the case ID to the alert schema when the user has read access only', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              settings: { syncAlerts: false, extractObservables: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          const signals = await createSecuritySolutionAlerts(supertest, log);
          const alert = signals.hits.hits[0];

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id!, index: alert._index }],
            expectedHttpCode: 200,
            auth: { user: secOnlyReadAlerts, space: 'space1' },
          });
        });

        it('should NOT add the case ID to the alert schema when the user does NOT have access to the alert', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              settings: { syncAlerts: false, extractObservables: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          const signals = await createSecuritySolutionAlerts(supertest, log);
          const alert = signals.hits.hits[0];

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id!, index: alert._index }],
            expectedHttpCode: 403,
            auth: { user: obsSec, space: 'space1' },
          });
        });

        it('should add the case ID to the alert schema when the user has read access to the kibana feature but no read access to the ES index', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              settings: { syncAlerts: false, extractObservables: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          const signals = await createSecuritySolutionAlerts(supertest, log);
          const alert = signals.hits.hits[0];

          await bulkCreateAttachmentsAndRefreshIndex({
            caseId: postedCase.id,
            alerts: [{ id: alert._id!, index: alert._index }],
            expectedHttpCode: 200,
            auth: { user: secSolutionOnlyReadNoIndexAlerts, space: 'space1' },
          });
        });
      });

      describe('observability', () => {
        const alertId = 'NoxgpHkBqbdrfX07MqXV';
        const apmIndex = '.alerts-observability.apm.alerts';

        beforeEach(async () => {
          await esArchiver.load('x-pack/platform/test/fixtures/es_archives/rule_registry/alerts');
        });

        afterEach(async () => {
          await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/rule_registry/alerts');
        });

        const bulkCreateAlertsAndVerifyCaseIdsInAlertSchema = async (totalCases: number) => {
          const cases = await Promise.all(
            [...Array(totalCases).keys()].map((index) =>
              createCase(supertest, {
                ...postCaseReq,
                owner: 'observabilityFixture',
                settings: { syncAlerts: false, extractObservables: false },
              })
            )
          );

          for (const theCase of cases) {
            await bulkCreateAttachments({
              supertest,
              caseId: theCase.id,
              params: [buildUnifiedAlertReq('observabilityFixture', { alertId, index: apmIndex })],
            });
          }

          const updatedAlert = await getAlertById({
            supertest,
            id: alertId,
            index: apmIndex,
            auth: { user: superUser, space: 'space1' },
          });

          const caseIds = cases.map((theCase) => theCase.id);

          expect(updatedAlert['kibana.alert.case_ids']).eql(caseIds);

          return { alert: updatedAlert, cases };
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
            params: [buildUnifiedAlertReq('observabilityFixture', { alertId, index: apmIndex })],
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
            settings: { syncAlerts: false, extractObservables: false },
          });

          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [buildUnifiedAlertReq('securitySolutionFixture', { alertId, index: apmIndex })],
            expectedHttpCode: 400,
          });
        });

        it('should add the case ID to the alert schema when the user has read access only', async () => {
          const postedCase = await createCase(
            supertest,
            {
              ...postCaseReq,
              owner: 'observabilityFixture',
              settings: { syncAlerts: false, extractObservables: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: [buildUnifiedAlertReq('observabilityFixture', { alertId, index: apmIndex })],
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
              settings: { syncAlerts: false, extractObservables: false },
            },
            200,
            { user: superUser, space: 'space1' }
          );

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: [buildUnifiedAlertReq('observabilityFixture', { alertId, index: apmIndex })],
            auth: { user: obsSec, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      });
    });

    describe('alert format', () => {
      // Unified alerts have no id/index pairing check yet, so these cases use the legacy shape.
      const alertFormatCases: Array<{ alertId: string | string[]; index: string | string[] }> = [
        { alertId: '1', index: ['index1', 'index2'] },
        { alertId: ['1', '2'], index: 'index' },
      ];
      for (const { alertId, index } of alertFormatCases) {
        it(`throws an error with an alert comment with contents id: ${alertId} indices: ${index}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [buildUnifiedAlertReq('securitySolutionFixture', { alertId, index })],
            expectedHttpCode: 400,
          });
        });
      }

      it('does not throw an error with correct alert formatting', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const attachments = [
          buildUnifiedAlertReq('securitySolutionFixture', { alertId: '1', index: ['index1'] }),
          buildUnifiedAlertReq('securitySolutionFixture', {
            alertId: ['1', '2'],
            index: ['index', 'other-index'],
          }),
        ];

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: attachments,
          expectedHttpCode: 200,
        });
      });
    });

    describe('alert filtering', () => {
      it('does not create a new attachment if the alert is already attached to the case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertReq],
          expectedHttpCode: 200,
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertReq],
          expectedHttpCode: 200,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(1);
      });

      it('does not create a new attachment if the alert is already attached to the case on the same request', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertReq, postUnifiedAlertReq],
          expectedHttpCode: 200,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(1);
      });

      it('should not create a new attachment if the alerts are already attached to the case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertMultipleIdsReq],
          expectedHttpCode: 200,
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertMultipleIdsReq],
          expectedHttpCode: 200,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(1);
      });

      it('should not create a new attachment if the alerts are already attached to the case on the same request', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertMultipleIdsReq, postUnifiedAlertMultipleIdsReq],
          expectedHttpCode: 200,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(1);
      });

      it('should create a new attachment without alerts attached to the case', async () => {
        const alertCommentWithId3 = buildUnifiedAlertReq('securitySolutionFixture', {
          alertId: ['test-id-1', 'test-id-2', 'test-id-3'],
          index: ['test-index-1', 'test-index-2', 'test-index-3'],
        });

        const allAttachments = [postCommentAlertMultipleIdsReq, legacyAlertCommentOnlyId3];

        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertMultipleIdsReq],
          expectedHttpCode: 200,
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [alertCommentWithId3],
          expectedHttpCode: 200,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(2);

        validateCommentsIgnoringOrder(attachments, allAttachments);
      });

      it('should create a new attachment without alerts attached to the case on the same request', async () => {
        const alertCommentWithId3 = buildUnifiedAlertReq('securitySolutionFixture', {
          alertId: ['test-id-1', 'test-id-2', 'test-id-3'],
          index: ['test-index-1', 'test-index-2', 'test-index-3'],
        });

        const allAttachments = [postCommentAlertMultipleIdsReq, legacyAlertCommentOnlyId3];

        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertMultipleIdsReq, alertCommentWithId3],
          expectedHttpCode: 200,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(2);

        validateCommentsIgnoringOrder(attachments, allAttachments);
      });

      it('does not remove user comments when filtering out duplicate alerts', async () => {
        const alertCommentWithId3 = buildUnifiedAlertReq('securitySolutionFixture', {
          alertId: ['test-id-1', 'test-id-2', 'test-id-3'],
          index: ['test-index-1', 'test-index-2', 'test-index-3'],
        });

        const superComment = {
          ...postUnifiedCommentReq,
          data: { content: 'Super comment' },
        };

        const allAttachments = [
          postCommentAlertMultipleIdsReq,
          legacyAlertCommentOnlyId3,
          postCommentUserReq,
          { ...postCommentUserReq, comment: 'Super comment' },
        ];

        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedAlertMultipleIdsReq],
          expectedHttpCode: 200,
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [superComment, alertCommentWithId3, postUnifiedCommentReq],
          expectedHttpCode: 200,
        });

        const attachments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(attachments.length).to.eql(4);

        validateCommentsIgnoringOrder(attachments, allAttachments);
      });
    });

    describe('partial updates', () => {
      it('should not result to a version conflict (409) when adding comments to an updated case', async () => {
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

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postUnifiedCommentReq],
          expectedHttpCode: 200,
        });
      });

      it('should set the attachment stats correctly', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            postUnifiedCommentReq,
            postUnifiedCommentReq,
            postUnifiedAlertReq,
            // an attachment that is not a comment or an alert should not affect the stats
            postUnifiedActionsReq,
          ],
          expectedHttpCode: 200,
        });

        const res = await getCaseSavedObjectsFromES({ es });

        expect(res.body.hits.hits.length).to.eql(1);

        const theCase = res.body.hits.hits[0]._source?.cases!;

        expect(theCase.total_alerts).to.eql(1);
        expect(theCase.total_comments).to.eql(2);
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
          params: [postUnifiedCommentReq],
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
          params: [{ ...postUnifiedCommentReq, owner: 'observabilityFixture' }],
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
            params: [postUnifiedCommentReq],
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
          params: [postUnifiedCommentReq],
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
