/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'security_cases'];
  const testSubjects = getService('testSubjects');

  describe('Security case settings and custom fields', function () {
    it('case settings screenshots', async () => {
      await pageObjects.common.navigateToApp('security', { path: 'cases' });
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('configure-case-button');
      await commonScreenshots.takeScreenshot('cases-settings', screenshotDirectories);
      await testSubjects.click('add-custom-field');
      await commonScreenshots.takeScreenshot(
        'cases-add-custom-field',
        screenshotDirectories,
        1400,
        700
      );
      await testSubjects.setValue('custom-field-label-input', 'my-field');
      await testSubjects.click('custom-field-flyout-save');
      await commonScreenshots.takeScreenshot(
        'cases-custom-field-settings',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });
}
