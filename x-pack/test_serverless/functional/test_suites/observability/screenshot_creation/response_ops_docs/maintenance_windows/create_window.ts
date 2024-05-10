/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'svlCommonPage']);
  const svlCommonScreenshots = getService('svlCommonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'observability_maintenace_windows'];
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  describe('create window', function () {
    beforeEach(async () => {
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('create maintenance window screenshot', async () => {
      await pageObjects.common.navigateToApp('maintenanceWindows');
      await pageObjects.header.waitUntilLoadingHasFinished();
      const createButton = await find.byCssSelector(
        '[data-test-subj="mw-empty-prompt"] .euiButton'
      );
      await createButton.click();
      await svlCommonScreenshots.takeScreenshot(
        'create-maintenance-window',
        screenshotDirectories,
        1400,
        1600
      );
      const filterAlerts = await find.byCssSelector(
        '[data-test-subj="maintenanceWindowScopedQuerySwitch"] .euiSwitch__button'
      );
      await filterAlerts.click();
      const radioGroup = await testSubjects.find('maintenanceWindowCategorySelectionRadioGroup');
      const label = await radioGroup.findByCssSelector(`label[for="observability"]`);
      await label.click();
      await testSubjects.setValue('queryInput', 'kibana.alert.rule.name: custom-threshold-rule-1');
      await svlCommonScreenshots.takeScreenshot(
        'create-maintenance-window-filter',
        screenshotDirectories,
        1400,
        1600
      );
      const cancelButton = await testSubjects.find('cancelMaintenanceWindow');
      await cancelButton.click();
    });
  });
}
