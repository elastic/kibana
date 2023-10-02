/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');

  const screenshotDirectories = ['response_ops_docs', 'stack_cases'];

  describe('list view', function () {
    before(async () => {
      const { id: caseId } = await cases.api.createCase({
        title: 'Web transactions',
        tags: ['e-commerce'],
        description: 'Investigate e-commerce sample data.',
      });
      await cases.api.createAttachment({
        caseId,
        params: { comment: 'test comment', type: AttachmentType.user, owner: 'cases' },
      });
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('cases list screenshot', async () => {
      await cases.navigation.navigateToApp();
      await commonScreenshots.takeScreenshot('cases', screenshotDirectories, 1400, 1024);
    });
  });
}
