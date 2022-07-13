/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExternalReferenceStorageType,
  CommentType,
  CaseResponse,
} from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');

  /**
   * Attachment types are being registered in
   * x-pack/test/functional_with_es_ssl/fixtures/plugins/cases/public/plugin.ts
   */
  describe('Attachment framework', () => {
    describe('External reference attachments', () => {
      let caseWithAttachment: CaseResponse;

      before(async () => {
        const caseData = await cases.api.createCase({ title: 'External references' });
        caseWithAttachment = await cases.api.createAttachment({
          caseId: caseData.id,
          params: {
            type: CommentType.externalReference,
            externalReferenceId: 'my-id',
            externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
            externalReferenceAttachmentTypeId: '.test',
            externalReferenceMetadata: null,
            owner: 'cases',
          },
        });

        await cases.navigation.navigateToApp();
        await cases.casesTable.waitForCasesToBeListed();
        await cases.casesTable.goToFirstListedCase();
        await header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('renders an external reference attachment type correctly', async () => {
        const attachmentId = caseWithAttachment?.comments?.[0].id;
        await testSubjects.existOrFail('comment-external-reference-.test');
        await testSubjects.existOrFail(`copy-link-${attachmentId}`);
        await testSubjects.existOrFail('test-attachment-action');
        await testSubjects.existOrFail('test-attachment-content');
      });
    });
  });
};
