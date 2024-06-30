/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  // const browser = getService('browser');
  // const find = getService('find');
  // const testSubjects = getService('testSubjects');
  const screenshotDirectories = ['response_ops_docs', 'stack_connectors'];
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage']);

  describe('connectors', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('viewer');
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('connectors list screenshot', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await svlCommonScreenshots.takeScreenshot(
        'connector-listing',
        screenshotDirectories,
        1400,
        1024
      );

      //   const searchBox = await find.byCssSelector('[data-test-subj="actionsList"] .euiFieldSearch');
      //   await searchBox.click();
      //   await searchBox.clearValue();
      //   await searchBox.type('my actionTypeId:(.index)');
      //   await searchBox.pressKeys(browser.keys.ENTER);
      //   const typeFilter = await find.byCssSelector(
      //     '[data-test-subj="actionsList"] .euiFilterButton'
      //   );
      //   await typeFilter.click();
      //   await commonScreenshots.takeScreenshot(
      //     'connector-filter-by-type',
      //     screenshotDirectories,
      //     1400,
      //     1024
      //   );

      //   const clearSearchButton = await testSubjects.find('clearSearchButton');
      //   await clearSearchButton.click();
      //   const checkAllButton = await testSubjects.find('checkboxSelectAll');
      //   await checkAllButton.click();
      //   await commonScreenshots.takeScreenshot('connector-delete', screenshotDirectories, 1400, 1024);
    });
  });
}
