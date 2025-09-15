/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'observability_cases'];
  const testSubjects = getService('testSubjects');

  describe('Observability case settings and custom fields', function () {
    it('case settings screenshots', async () => {
      await cases.navigation.navigateToApp('observability/cases', 'cases-all-title');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('configure-case-button');
      await testSubjects.click('add-custom-field');
      await commonScreenshots.takeScreenshot(
        'cases-add-custom-field',
        screenshotDirectories,
        1400,
        700
      );
      await testSubjects.setValue('custom-field-label-input', 'my-field');
      await testSubjects.click('common-flyout-save');
      await commonScreenshots.takeScreenshot('cases-settings', screenshotDirectories, 1400, 1024);
    });
  });
}
