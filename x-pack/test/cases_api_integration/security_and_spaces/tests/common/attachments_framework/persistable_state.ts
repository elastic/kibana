/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';

import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  defaultUser,
  persistableStateAttachment,
  postCaseReq,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  removeServerGeneratedPropertiesFromSavedObject,
  getSOFromKibanaIndex,
  getReferenceFromEsResponse,
  bulkCreateAttachments,
  updateComment,
  getCaseUserActions,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  /**
   * Attachment types are being registered in
   * x-pack/test/cases_api_integration/common/plugins/cases/server/plugin.ts
   */
  describe('Persistable state attachments', () => {
    describe('references', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should create a persistable state attachment type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: persistableStateAttachment,
        });
        const comment = removeServerGeneratedPropertiesFromSavedObject(patchedCase.comments![0]);

        expect(comment).to.eql({
          ...persistableStateAttachment,
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
          owner: 'securitySolutionFixture',
        });
      });

      it('should create a persistable state user action', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: persistableStateAttachment,
        });

        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const commentUserAction = userActions[1];

        expect(commentUserAction.type).to.eql('comment');
        expect(commentUserAction.action).to.eql('create');
        expect(commentUserAction.payload).to.eql({ comment: persistableStateAttachment });
      });

      it('should create references and attributes correctly', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: persistableStateAttachment,
        });

        const esResponse = await getSOFromKibanaIndex({
          es,
          soType: CASE_COMMENT_SAVED_OBJECT,
          soId: patchedCase.comments![0].id,
        });

        const commentOnES = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT];
        const ref = getReferenceFromEsResponse(esResponse, 'testRef');

        const comment = removeServerGeneratedPropertiesFromSavedObject(commentOnES);
        const commentWithoutInjectedId = omit(
          'persistableStateAttachmentState.injectedId',
          persistableStateAttachment
        );

        expect(ref).to.eql({ id: 'testRef', name: 'myTestReference', type: 'test-so' });
        expect(comment).to.eql({
          ...commentWithoutInjectedId,
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
        });
      });

      it('should create references and attributes correctly on user actions', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: persistableStateAttachment,
        });

        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const createCommentUserAction = userActions[1];

        const esResponse = await getSOFromKibanaIndex({
          es,
          soType: CASE_USER_ACTION_SAVED_OBJECT,
          soId: createCommentUserAction.action_id,
        });

        const commentOnES =
          esResponse.body._source?.[CASE_USER_ACTION_SAVED_OBJECT]?.payload.comment;
        const ref = getReferenceFromEsResponse(esResponse, 'testRef');

        const commentWithoutInjectedId = omit(
          'persistableStateAttachmentState.injectedId',
          persistableStateAttachment
        );

        expect(ref).to.eql({ id: 'testRef', name: 'myTestReference', type: 'test-so' });
        expect(commentOnES).to.eql(commentWithoutInjectedId);
      });

      it('should create references and attributes correctly when bulk create', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postCommentUserReq, persistableStateAttachment],
        });

        const externalRefComment = patchedCase.comments?.find(
          (comment) => comment.type === AttachmentType.persistableState
        );

        const esResponse = await getSOFromKibanaIndex({
          es,
          soType: CASE_COMMENT_SAVED_OBJECT,
          soId: externalRefComment!.id,
        });

        const commentOnES = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT];
        const ref = getReferenceFromEsResponse(esResponse, 'testRef');

        const comment = removeServerGeneratedPropertiesFromSavedObject(commentOnES);
        const commentWithoutInjectedId = omit(
          'persistableStateAttachmentState.injectedId',
          persistableStateAttachment
        );

        expect(ref).to.eql({ id: 'testRef', name: 'myTestReference', type: 'test-so' });
        expect(comment).to.eql({
          ...commentWithoutInjectedId,
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
        });
      });

      it('should put the new externalReferenceId to the SO references when updating the attachment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: persistableStateAttachment,
        });

        await updateComment({
          supertest,
          caseId: postedCase.id,
          req: {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            ...persistableStateAttachment,
            persistableStateAttachmentState: { foo: 'bar' },
          },
        });

        const esResponse = await getSOFromKibanaIndex({
          es,
          soType: CASE_COMMENT_SAVED_OBJECT,
          soId: patchedCase.comments![0].id,
        });

        const commentOnES = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT];
        const comment = removeServerGeneratedPropertiesFromSavedObject(commentOnES);
        const ref = getReferenceFromEsResponse(esResponse, 'testRef');
        const commentWithoutInjectedId = omit(
          'persistableStateAttachmentState.injectedId',
          persistableStateAttachment
        );

        expect(ref).to.eql({ id: 'testRef', name: 'myTestReference', type: 'test-so' });
        expect(comment).to.eql({
          ...commentWithoutInjectedId,
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: defaultUser,
        });
      });

      it('should return 400 when missing attributes for persistable state attachment type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const reqKeys = Object.keys(persistableStateAttachment);
        for (const key of reqKeys) {
          await createComment({
            supertest,
            caseId: postedCase.id,
            // @ts-expect-error
            params: omit(key, persistableStateAttachment),
            expectedHttpCode: 400,
          });
        }
      });

      it('400s when adding excess attributes for persistable state attachment type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          params: { ...persistableStateAttachment, notValid: 'test' },
          expectedHttpCode: 400,
        });
      });

      it('400s when creating a non registered persistable state attachment type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: { ...persistableStateAttachment, persistableStateAttachmentTypeId: 'not-exists' },
          expectedHttpCode: 400,
        });
      });

      it('400s when bulk creating a non registered persistable state attachment type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            persistableStateAttachment,
            { ...persistableStateAttachment, persistableStateAttachmentTypeId: 'not-exists' },
          ],
          expectedHttpCode: 400,
        });
      });
    });

    // This test is intended to fail when new persistable state attachment types are registered.
    // To resolve, add the new persistable state attachment types ID to this list. This will trigger
    // a CODEOWNERS review by Response Ops.
    describe('check registered persistable state attachment types', () => {
      const getRegisteredTypes = () => {
        return supertest
          .get('/api/cases_fixture/registered_persistable_state_attachments')
          .expect(200)
          .then((response) => response.body);
      };

      it('should check changes on all registered persistable state attachment types', async () => {
        const types = await getRegisteredTypes();

        expect(types).to.eql({
          '.lens': '78559fd806809ac3a1008942ead2a079864054f5',
          '.test': 'ab2204830c67f5cf992c9aa2f7e3ead752cc60a1',
          aiopsChangePointChart: 'a1212d71947ec34487b374cecc47ab9941b5d91c',
          ml_anomaly_charts: '23e92e824af9db6e8b8bb1d63c222e04f57d2147',
          ml_anomaly_swimlane: 'a3517f3e53fb041e9cbb150477fb6ef0f731bd5f',
        });
      });
    });
  });
};
