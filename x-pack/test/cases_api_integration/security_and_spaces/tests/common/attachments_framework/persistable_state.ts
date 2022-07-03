/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';

import { ActionTypes } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { defaultUser, persistableStateAttachment, postCaseReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  getCaseUserActions,
  removeServerGeneratedPropertiesFromSavedObject,
  getComment,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

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
    });

    describe('Migrations', () => {
      const CASE_ID = 'cdeede80-fa0f-11ec-bcb4-59410ea3e0fe';
      const ATTACHMENT_ID = '8cf7a270-fa11-11ec-bcb4-59410ea3e0fe';

      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.4.0/persistable_state_attachment.json'
        );
      });

      after(async () => {
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/cases/8.4.0/persistable_state_attachment.json'
        );
        await deleteAllCaseItems(es);
      });

      it('migrates a persistable state attachment correctly', async () => {
        const attachment = await getComment({
          supertest,
          caseId: CASE_ID,
          commentId: ATTACHMENT_ID,
        });

        const normalizedAttachment = removeServerGeneratedPropertiesFromSavedObject(attachment);

        expect(normalizedAttachment).to.eql({
          created_by: { email: null, full_name: null, username: 'elastic' },
          owner: 'cases',
          persistableStateAttachmentState: { migrated: true },
          persistableStateAttachmentTypeId: '.test',
          pushed_at: null,
          pushed_by: null,
          type: 'persistableState',
          updated_by: null,
        });
      });

      it('migrates a persistable state attachment correctly on user action', async () => {
        const userActions = await getCaseUserActions({ supertest, caseID: CASE_ID });
        const attachment = userActions.find(
          (userAction) => userAction.type === ActionTypes.comment
        );

        expect(attachment?.payload).to.eql({
          comment: {
            owner: 'cases',
            persistableStateAttachmentState: { migrated: true },
            persistableStateAttachmentTypeId: '.test',
            type: 'persistableState',
          },
        });
      });
    });
  });
};
