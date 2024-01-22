/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createAndUploadFile } from '../../../../cases_api_integration/common/lib/api';
import { OBSERVABILITY_FILE_KIND } from '../../../../cases_api_integration/common/lib/constants';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const common = getPageObject('common');
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');
  let caseIdMonitoring: string;
  let caseOwnerMonitoring: string;

  describe('list view', function () {
    before(async () => {
      const { id: caseIdMetrics } = await cases.api.createCase({
        title: 'Metrics inventory',
        tags: ['IBM resilient'],
        description: 'Test.',
        owner: 'observability',
      });
      await cases.api.createAttachment({
        caseId: caseIdMetrics,
        params: { comment: 'test comment', type: AttachmentType.user, owner: 'observability' },
      });
      await cases.api.createAttachment({
        caseId: caseIdMetrics,
        params: { comment: '2nd test comment', type: AttachmentType.user, owner: 'observability' },
      });

      const { id: caseIdLogs, version: caseVersionLogs } = await cases.api.createCase({
        title: 'Logs threshold',
        tags: ['jira'],
        description: 'Test.',
        owner: 'observability',
      });
      await cases.api.setStatus(caseIdLogs, caseVersionLogs, 'closed');

      const caseMonitoring = await cases.api.createCase({
        title: 'Monitor uptime',
        tags: ['swimlane'],
        description: 'Test.',
        owner: 'observability',
      });
      caseIdMonitoring = caseMonitoring.id;
      caseOwnerMonitoring = caseMonitoring.owner;

      const { version: caseVersionMonitoring } = await cases.api.createAttachment({
        caseId: caseIdMonitoring,
        params: { comment: 'test comment', type: AttachmentType.user, owner: 'observability' },
      });

      await cases.api.setStatus(caseIdMonitoring, caseVersionMonitoring, 'in-progress');

      await createAndUploadFile({
        supertest,
        createFileParams: {
          name: 'testfile',
          kind: OBSERVABILITY_FILE_KIND,
          mimeType: 'image/png',
          meta: {
            caseIds: [caseIdMonitoring],
            owner: [caseOwnerMonitoring],
          },
        },
        data: 'abc',
      });
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('cases list screenshot', async () => {
      await cases.navigation.navigateToApp('observability/cases', 'cases-all-title');
      await commonScreenshots.takeScreenshot('cases', screenshotDirectories, 1700, 1024);
    });

    it('case detail screenshot', async () => {
      await common.navigateToUrlWithBrowserHistory('observability', `/cases/${caseIdMonitoring}`);
      const filesTab = await testSubjects.find('case-view-tab-title-files');
      await filesTab.click();
      await commonScreenshots.takeScreenshot(
        'observabiity-case-files',
        screenshotDirectories,
        1400,
        1024
      );
    });

    it('case settings screenshot', async () => {
      await cases.navigation.navigateToApp('observability/cases', 'cases-all-title');
      await testSubjects.click('configure-case-button');
      await commonScreenshots.takeScreenshot('add-case-connector', screenshotDirectories);
    });
  });
}
