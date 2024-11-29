/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const commonScreenshots = getService('commonScreenshots');
  const rules = getService('rules');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'stack_alerting'];

  describe('tracking containment rule', function () {
    it('create rule screenshot', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await rules.common.clickCreateAlertButton();
      await testSubjects.click('.geo-containment-SelectOption');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await comboBox.setCustom('entitiesDataView', 'Kibana Sample Data Logs');
      await commonScreenshots.takeScreenshot(
        'alert-types-tracking-containment-conditions',
        screenshotDirectories,
        1400,
        1500
      );

      await testSubjects.click('.server-log-alerting-ActionTypeSelectOption');
      await testSubjects.scrollIntoView('addAlertActionButton');
      await commonScreenshots.takeScreenshot(
        'alert-types-tracking-containment-action-options',
        screenshotDirectories,
        1400,
        1024
      );
      await testSubjects.scrollIntoView('addAlertActionButton');
      await testSubjects.click('messageAddVariableButton');
      await commonScreenshots.takeScreenshot(
        'alert-types-tracking-containment-rule-action-variables',
        screenshotDirectories,
        1400,
        1024
      );
      await testSubjects.click('cancelSaveRuleButton');
    });
  });
}
