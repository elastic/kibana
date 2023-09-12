/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'stack_connectors'];
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');

  describe('tines connector', function () {
    it('tines connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      // await actions.common.openNewConnectorForm('tines');
      const createBtn = await testSubjects.find('createActionButton');
      const createBtnIsVisible = await createBtn.isDisplayed();
      if (createBtnIsVisible) {
        await createBtn.click();
      } else {
        await testSubjects.click('createFirstActionButton');
      }

      await testSubjects.click(`.tines-card`);
      await testSubjects.setValue('nameInput', 'Tines test connector');
      await svlCommonScreenshots.takeScreenshot('tines-connector', screenshotDirectories);
      // await testSubjects.click('create-connector-flyout-save-test-btn');
      // await testSubjects.click('toastCloseButton');
      // await pageObjects.common.closeToast();
      // await commonScreenshots.takeScreenshot('tines-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
