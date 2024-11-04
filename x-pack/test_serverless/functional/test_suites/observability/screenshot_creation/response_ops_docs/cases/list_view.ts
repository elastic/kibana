/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
import type { RoleCredentials } from '../../../../../../shared/services';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { navigateToCasesApp } from '../../../../../../shared/lib/cases';

export default function ({ getPageObject, getPageObjects, getService }: FtrProviderContext) {
  const cases = getService('cases');
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage', 'svlCommonNavigation']);
  const svlCases = getService('svlCases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  const testSubjects = getService('testSubjects');
  const svlUserManager = getService('svlUserManager');
  const owner = OBSERVABILITY_OWNER;
  let caseIdMonitoring: string;

  describe('list view', function () {
    let roleAuthc: RoleCredentials;
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Metrics inventory',
          tags: ['IBM resilient'],
          description: 'Test.',
          owner,
        }),
        roleAuthc
      );

      await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Logs threshold',
          tags: ['jira'],
          description: 'Test.',
          owner,
        }),
        roleAuthc
      );

      const caseMonitoring = await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest(owner, {
          title: 'Monitor uptime',
          tags: ['swimlane'],
          description: 'Test.',
          owner,
        }),
        roleAuthc
      );
      caseIdMonitoring = caseMonitoring.id;
      await pageObjects.svlCommonPage.loginWithPrivilegedRole();
    });

    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    it('cases list screenshot', async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await svlCommonScreenshots.takeScreenshot('cases', screenshotDirectories, 1700, 1024);
    });

    it('case detail screenshot', async () => {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'observability',
        `/cases/${caseIdMonitoring}`,
        undefined
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('case-view-title');
      await pageObjects.svlCommonNavigation.sidenav.toggle(true);
      const filesTab = await testSubjects.find('case-view-tab-title-files');
      await filesTab.click();
      await cases.casesFilesTable.addFile(require.resolve('./testfile.png'));
      await testSubjects.getVisibleText('cases-files-name-link');
      await svlCommonScreenshots.takeScreenshot(
        'cases-files-tab',
        screenshotDirectories,
        1024,
        768
      );
    });
  });
}
