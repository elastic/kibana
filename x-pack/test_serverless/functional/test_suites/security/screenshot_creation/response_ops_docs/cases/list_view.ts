/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { navigateToCasesApp } from '../../../../../../shared/lib/cases';

export default function ({ getPageObject, getPageObjects, getService }: FtrProviderContext) {
  const cases = getService('cases');
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage', 'svlCommonNavigation']);
  const svlCases = getService('svlCases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'security_cases'];
  const testSubjects = getService('testSubjects');
  const owner = SECURITY_SOLUTION_OWNER;
  let caseIdSuspiciousEmail: string;

  describe('list view', function () {
    before(async () => {
      await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Unusual processes identified',
          tags: ['linux', 'os processes'],
          description: 'Test.',
          owner,
          severity: CaseSeverity.HIGH,
        })
      );

      const caseSuspiciousEmail = await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Suspicious emails reported',
          tags: ['email', 'phishing'],
          description: 'Several employees have received suspicious emails from an unknown address.',
          owner,
        })
      );
      caseIdSuspiciousEmail = caseSuspiciousEmail.id;

      await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Malware investigation',
          tags: ['malware'],
          description: 'Test.',
          owner,
          severity: CaseSeverity.MEDIUM,
        })
      );
    });

    after(async () => {
      await svlCases.api.deleteAllCaseItems();
      await pageObjects.svlCommonPage.forceLogout();
    });

    beforeEach(async () => {
      await pageObjects.svlCommonPage.login();
    });

    it('cases list screenshot', async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await svlCommonScreenshots.takeScreenshot('cases-home-page', screenshotDirectories);
    });

    it('case settings screenshot', async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await testSubjects.click('configure-case-button');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await svlCommonScreenshots.takeScreenshot('case-settings', screenshotDirectories);
    });

    it('case detail screenshot', async () => {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolution',
        `/cases/${caseIdSuspiciousEmail}`,
        undefined
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('case-view-title');
      await pageObjects.svlCommonNavigation.sidenav.toggle(true);
      await svlCommonScreenshots.takeScreenshot('cases-ui-open', screenshotDirectories, 1400, 1024);
      const filesTab = await testSubjects.find('case-view-tab-title-files');
      await filesTab.click();
      await cases.casesFilesTable.addFile(require.resolve('./testfile.png'));
      await testSubjects.getVisibleText('cases-files-name-link');
      await svlCommonScreenshots.takeScreenshot('cases-files', screenshotDirectories, 1400, 1024);
    });
  });
}
