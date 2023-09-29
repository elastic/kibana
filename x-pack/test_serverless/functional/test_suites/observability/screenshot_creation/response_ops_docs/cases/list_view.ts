/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
// import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { navigateToCasesApp } from '../../../../../../shared/lib/cases';
// import { createAndUploadFile } from '../../../../cases_api_integration/common/lib/api';
// import { OBSERVABILITY_FILE_KIND } from '../../../../cases_api_integration/common/lib/constants';

export default function ({ getPageObject, getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage']);
  const cases = getService('cases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  // const supertest = getService('supertest');
  // const testSubjects = getService('testSubjects');
  // let caseIdMonitoring: string;
  // let caseOwnerMonitoring: string;

  describe('list view', function () {
    before(async () => {
      // const { id: caseIdMetrics } = await cases.api.createCase({
      await cases.api.createCase({
        title: 'Metrics inventory',
        tags: ['IBM resilient'],
        description: 'Test.',
        owner: 'observability',
      });
      // await cases.api.createAttachment({
      //   caseId: caseIdMetrics,
      //   params: { comment: 'test comment', type: AttachmentType.user, owner: 'observability' },
      // });
      // await cases.api.createAttachment({
      //   caseId: caseIdMetrics,
      //   params: { comment: '2nd test comment', type: AttachmentType.user, owner: 'observability' },
      // });

      const { id: caseIdLogs, version: caseVersionLogs } = await cases.api.createCase({
        title: 'Logs threshold',
        tags: ['jira'],
        description: 'Test.',
        owner: 'observability',
      });
      await cases.api.setStatus(caseIdLogs, caseVersionLogs, 'closed');

      const { id: caseIdMonitoring, version: caseVersionMonitoring } = await cases.api.createCase({
        title: 'Monitor uptime',
        tags: ['swimlane'],
        description: 'Test.',
        owner: 'observability',
      });
      await cases.api.setStatus(caseIdMonitoring, caseVersionMonitoring, 'in-progress');

      // caseIdMonitoring = caseMonitoring.id;
      // caseOwnerMonitoring = caseMonitoring.owner;

      // const { version: caseVersionMonitoring } = await cases.api.createAttachment({
      //   caseId: caseIdMonitoring,
      //   params: { comment: 'test comment', type: AttachmentType.user, owner: 'observability' },
      // });
      // await createAndUploadFile({
      //   supertest,
      //   createFileParams: {
      //     name: 'testfile',
      //     kind: OBSERVABILITY_FILE_KIND,
      //     mimeType: 'image/png',
      //     meta: {
      //       caseIds: [caseIdMonitoring],
      //       owner: [caseOwnerMonitoring],
      //     },
      //   },
      //   data: 'abc',
      // });
    });

    after(async () => {
      await cases.api.deleteAllCases();
      await pageObjects.svlCommonPage.forceLogout();
    });

    beforeEach(async () => {
      await pageObjects.svlCommonPage.login();
    });

    it('cases list screenshot', async () => {
      const owner = OBSERVABILITY_OWNER;
      await navigateToCasesApp(getPageObject, getService, owner);
      await cases.navigation.navigateToApp('observability/cases', 'cases-all-title');
      await svlCommonScreenshots.takeScreenshot('cases', screenshotDirectories, 1700, 1024);
    });

    // it('case detail screenshot', async () => {
    //   await pageObjects.common.navigateToUrlWithBrowserHistory('observability', `/cases/${caseIdMonitoring}`);
    //   await pageObjects.header.waitUntilLoadingHasFinished();
    //   const filesTab = await testSubjects.find('case-view-tab-title-files');
    //   await filesTab.click();
    //   await svlCommonScreenshots.takeScreenshot(
    //     'observabiity-case-files',
    //     screenshotDirectories,
    //     1400,
    //     1024
    //   );
    // });
  });
}
