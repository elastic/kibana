/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { navigateToCasesApp } from '../../../../../../shared/lib/cases';

export default function ({ getPageObject, getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage', 'svlCommonNavigation']);
  const svlCases = getService('svlCases');
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'security_cases'];
  const testSubjects = getService('testSubjects');
  const owner = SECURITY_SOLUTION_OWNER;

  // FLAKY: https://github.com/elastic/kibana/issues/188997
  describe.skip('security case settings', function () {
    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    beforeEach(async () => {
      await pageObjects.svlCommonPage.loginWithRole('admin');
    });

    it('case settings screenshot', async () => {
      await navigateToCasesApp(getPageObject, getService, owner);
      await testSubjects.click('configure-case-button');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('add-custom-field');
      await svlCommonScreenshots.takeScreenshot(
        'security-cases-custom-fields',
        screenshotDirectories,
        1400,
        700
      );
      await testSubjects.setValue('custom-field-label-input', 'my-field');
      await testSubjects.click('common-flyout-save');
      await svlCommonScreenshots.takeScreenshot('security-cases-settings', screenshotDirectories);
      await testSubjects.click('add-template');
      await svlCommonScreenshots.takeScreenshot(
        'security-cases-templates',
        screenshotDirectories,
        1400,
        1000
      );
      await testSubjects.click('common-flyout-cancel');
      await testSubjects.click('dropdown-connectors');
      await testSubjects.click('dropdown-connector-add-connector');
      await svlCommonScreenshots.takeScreenshot('security-cases-connectors', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
