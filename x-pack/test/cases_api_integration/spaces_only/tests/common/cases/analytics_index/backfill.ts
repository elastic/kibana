/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';
import { OBSERVABLE_TYPE_IPV4, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common/constants';
import {
  runAttachmentsBackfillTask,
  runCasesBackfillTask,
  runCommentsBackfillTask,
} from '../../../../../common/lib/api/analytics';
import {
  addObservable,
  createCase,
  createConfiguration,
  createComment,
  createFileAttachment,
  deleteAllCaseItems,
  deleteAllFiles,
  getAuthWithSuperUser,
  getConfigurationRequest,
} from '../../../../../common/lib/api';
import {
  getPostCaseRequest,
  postCaseReq,
  postFileReq,
  postCommentAlertReq,
  postCommentUserReq,
} from '../../../../../common/lib/mock';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const retry = getService('retry');
  const authSpace1 = getAuthWithSuperUser();

  describe('analytics indexes backfill task', () => {
    afterEach(async () => {
      await deleteAllCaseItems(esClient);
      await deleteAllFiles({
        supertest,
        auth: authSpace1,
      });
    });

    it('should backfill the cases index', async () => {
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: {
            customFields: [
              {
                key: 'test_custom_field',
                label: 'text',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
            ],
          },
        })
      );

      const postCaseRequest = getPostCaseRequest({
        category: 'foobar',
        assignees: [{ uid: 'mscott@theoffice.com' }],
        customFields: [
          {
            key: 'test_custom_field',
            type: CustomFieldTypes.TEXT,
            value: 'value',
          },
        ],
      });

      const caseToBackfill = await createCase(supertest, postCaseRequest, 200);

      await addObservable({
        supertest,
        caseId: caseToBackfill.id,
        params: {
          observable: {
            value: '127.0.0.1',
            typeKey: OBSERVABLE_TYPE_IPV4.key,
            description: 'observable description',
          },
        },
      });

      await runCasesBackfillTask(supertest);

      await retry.try(async () => {
        const caseAnalytics = await esClient.get({
          index: '.internal.cases',
          id: `cases:${caseToBackfill.id}`,
        });

        expect(caseAnalytics.found).to.be(true);

        const {
          '@timestamp': timestamp,
          created_at: createdAt,
          created_at_ms: createdAtMs,
          ...analyticsFields
        } = caseAnalytics._source as any;

        expect(timestamp).not.to.be(null);
        expect(timestamp).not.to.be(undefined);
        expect(createdAt).not.to.be(null);
        expect(createdAt).not.to.be(undefined);
        expect(createdAtMs).not.to.be(null);
        expect(createdAtMs).not.to.be(undefined);

        expectSnapshot(analyticsFields).toMatch();
      });
    });

    it('should backfill the cases attachments index', async () => {
      const postedCase = await createCase(
        supertest,
        { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER },
        200,
        authSpace1
      );

      await createFileAttachment({
        supertest,
        caseId: postedCase.id,
        params: postFileReq,
        auth: authSpace1,
      });

      const postedCaseWithAttachments = await createComment({
        supertest,
        caseId: postedCase.id,
        params: {
          ...postCommentAlertReq,
          alertId: 'test-id-2',
          index: 'test-index-2',
          owner: SECURITY_SOLUTION_OWNER,
        },
        auth: authSpace1,
      });

      await runAttachmentsBackfillTask(supertest);

      await retry.try(async () => {
        const firstAttachmentAnalytics = await esClient.get({
          index: '.internal.cases-attachments',
          id: `cases-comments:${postedCaseWithAttachments.comments![0].id}`,
        });

        expect(firstAttachmentAnalytics.found).to.be(true);
      });

      const secondAttachmentAnalytics = await esClient.get({
        index: '.internal.cases-attachments',
        id: `cases-comments:${postedCaseWithAttachments.comments![1].id}`,
      });

      expect(secondAttachmentAnalytics.found).to.be(true);
    });

    it('should backfill the cases comments index', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      await runCommentsBackfillTask(supertest);

      await retry.try(async () => {
        const commentAnalytics = await esClient.get({
          index: '.internal.cases-comments',
          id: `cases-comments:${patchedCase.comments![0].id}`,
        });

        expect(commentAnalytics.found).to.be(true);

        const {
          '@timestamp': timestamp,
          created_at: createdAt,
          case_id: caseId,
          ...analyticsFields
        } = commentAnalytics._source as any;

        expect(caseId).to.be(postedCase.id);

        expect(timestamp).not.to.be(null);
        expect(timestamp).not.to.be(undefined);
        expect(createdAt).not.to.be(null);
        expect(createdAt).not.to.be(undefined);

        expectSnapshot(analyticsFields).toMatch();
      });
    });
  });
};
