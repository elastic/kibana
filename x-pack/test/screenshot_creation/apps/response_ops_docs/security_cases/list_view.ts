/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createAndUploadFile } from '../../../../cases_api_integration/common/lib/api';
import { SECURITY_SOLUTION_FILE_KIND } from '../../../../cases_api_integration/common/lib/constants';

export default function ({ getPageObject, getService, getPageObjects }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'security_cases'];
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');
  let caseIdSuspiciousEmail: string;
  let caseOwnerSuspiciousEmail: string;

  describe('list view', function () {
    before(async () => {
      await cases.api.createCase({
        title: 'Unusual processes identified',
        tags: ['linux', 'os processes'],
        description: 'Test.',
        owner: 'securitySolution',
        severity: CaseSeverity.HIGH,
      });

      const caseSuspiciousEmail = await cases.api.createCase({
        title: 'Suspicious emails reported',
        tags: ['email', 'phishing'],
        description: 'Several employees have received suspicious emails from an unknown address.',
        owner: 'securitySolution',
      });
      caseIdSuspiciousEmail = caseSuspiciousEmail.id;
      caseOwnerSuspiciousEmail = caseSuspiciousEmail.owner;

      await cases.api.createCase({
        title: 'Malware investigation',
        tags: ['malware'],
        description: 'Test.',
        owner: 'securitySolution',
        severity: CaseSeverity.MEDIUM,
      });

      await createAndUploadFile({
        supertest,
        createFileParams: {
          name: 'testfile',
          kind: SECURITY_SOLUTION_FILE_KIND,
          mimeType: 'image/png',
          meta: {
            caseIds: [caseIdSuspiciousEmail],
            owner: [caseOwnerSuspiciousEmail],
          },
        },
        data: 'abc',
      });
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('cases list screenshot', async () => {
      await pageObjects.common.navigateToApp('security', { path: 'cases' });
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot('cases-home-page', screenshotDirectories, 1700, 1024);
    });

    it('case details screenshot', async () => {
      await pageObjects.common.navigateToApp('security', {
        path: `cases/${caseIdSuspiciousEmail}`,
      });
      await commonScreenshots.takeScreenshot('cases-ui-open', screenshotDirectories, 1400, 1024);

      const filesTab = await testSubjects.find('case-view-tab-title-files');
      await filesTab.click();
      await commonScreenshots.takeScreenshot('cases-files', screenshotDirectories, 1400, 1024);
    });
  });
}
