/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'observability_connectors'];
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');

  describe('server log connector', function () {
    beforeEach(async () => {
      await pageObjects.svlCommonPage.loginWithRole('admin');
    });

    it('server log connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('createFirstActionButton');
      await testSubjects.click(`.server-log-card`);
      await testSubjects.setValue('nameInput', 'Server log test connector');
      await svlCommonScreenshots.takeScreenshot('serverlog-connector', screenshotDirectories);
      const saveTestButton = await testSubjects.find('create-connector-flyout-save-test-btn');
      await saveTestButton.click();
      await svlCommonScreenshots.takeScreenshot('serverlog-params-test', screenshotDirectories);
      const flyOutCancelButton = await testSubjects.find('euiFlyoutCloseButton');
      await flyOutCancelButton.click();
    });
  });
}
