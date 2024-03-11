/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
export default function ({ getPageObject, getService }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const find = getService('find');
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const screenshotDirectories = ['response_ops_docs', 'stack_cases'];

  describe('add custom fields', function () {
    it('case settings screenshot', async () => {
      await cases.navigation.navigateToApp();
      await cases.navigation.navigateToConfigurationPage();
      await testSubjects.click('add-custom-field');
      await commonScreenshots.takeScreenshot(
        'cases-custom-fields-add',
        screenshotDirectories,
        1400,
        700
      );
      await testSubjects.setValue('custom-field-label-input', 'my-field');
      await testSubjects.click('custom-field-flyout-save');
      await commonScreenshots.takeScreenshot(
        'cases-custom-fields-view',
        screenshotDirectories,
        1400,
        1024
      );
      await cases.navigation.navigateToApp();
      await cases.casesTable.waitForCasesToBeListed();
      await cases.casesTable.goToFirstListedCase();
      await header.waitUntilLoadingHasFinished();
      await find.byCssSelector('[data-test-subj="no-custom-field-value"]');
      await commonScreenshots.takeScreenshot(
        'cases-custom-fields',
        screenshotDirectories,
        1400,
        1400
      );
      await cases.navigation.navigateToApp();
      await testSubjects.click('createNewCaseBtn');
      await commonScreenshots.takeScreenshot('cases-create', screenshotDirectories, 1400, 1900);
      await testSubjects.click('create-case-cancel');
    });
  });
}
