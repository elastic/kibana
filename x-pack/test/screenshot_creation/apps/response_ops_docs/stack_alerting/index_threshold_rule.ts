/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const commonScreenshots = getService('commonScreenshots');
  const find = getService('find');
  const rules = getService('rules');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'stack_alerting'];
  const ruleName = 'kibana sites - high egress';

  describe('index threshold rule', function () {
    it('create rule screenshot', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await rules.common.clickCreateAlertButton();
      await testSubjects.setValue('ruleNameInput', ruleName);
      await testSubjects.click('tagsComboBox');
      await testSubjects.setValue('tagsComboBox', 'sample-data');
      await testSubjects.click('solutionsFilterButton');
      await testSubjects.click('solutionstackAlertsFilterOption');
      await testSubjects.setValue('solutionsFilterButton', 'solutionstackAlertsFilterOption');
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-select',
        screenshotDirectories,
        1400,
        1024
      );

      await testSubjects.click('.index-threshold-SelectOption');
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-conditions',
        screenshotDirectories,
        1400,
        1300
      );

      await testSubjects.scrollIntoView('selectIndexExpression');
      await testSubjects.click('selectIndexExpression');
      await comboBox.set('thresholdIndexesComboBox', 'kibana_sample_data_logs ');
      await testSubjects.click('thresholdAlertTimeFieldSelect');
      await testSubjects.setValue('thresholdAlertTimeFieldSelect', '@timestamp');
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-index',
        screenshotDirectories,
        1400,
        1024
      );
      await testSubjects.click('closePopover');

      await testSubjects.click('whenExpression');
      await testSubjects.click('whenExpressionSelect');
      await testSubjects.setValue('whenExpressionSelect', 'sum()');
      await testSubjects.click('ofExpressionPopover');
      const ofComboBox = await find.byCssSelector('#ofField');
      await ofComboBox.click();
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-aggregation',
        screenshotDirectories,
        1400,
        1300
      );
      await ofComboBox.type('bytes');
      const ofOptionsString = await comboBox.getOptionsList('availablefieldsOptionsComboBox');
      const ofOptions = ofOptionsString.trim().split('\n');
      expect(ofOptions.length > 0).to.be(true);
      await comboBox.set('availablefieldsOptionsComboBox', ofOptions[0]);

      await testSubjects.click('groupByExpression');
      await testSubjects.click('overExpressionSelect');
      await testSubjects.setValue('overExpressionSelect', 'top');
      await testSubjects.setValue('fieldsNumberSelect', '4');
      await comboBox.set('fieldsExpressionSelect', 'host.keyword');
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-grouping',
        screenshotDirectories,
        1400,
        1024
      );
      // need this two out of popup clicks to close them
      const nameInput1 = await testSubjects.find('ruleNameInput');
      await nameInput1.click();

      await testSubjects.click('thresholdPopover');
      await testSubjects.setValue('alertThresholdInput', '420000');
      await testSubjects.click('forLastExpression');
      await testSubjects.setValue('timeWindowSizeNumber', '24');
      await testSubjects.setValue('timeWindowUnitSelect', 'hours');
      // need this two out of popup clicks to close them
      const nameInput2 = await testSubjects.find('ruleNameInput');
      await nameInput2.click();
      await testSubjects.scrollIntoView('thresholdPopover');
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-threshold',
        screenshotDirectories,
        1400,
        1300
      );

      await testSubjects.setValue('intervalInput', '4');
      await testSubjects.setValue('intervalInputUnit', 'hours');
      // need this two out of popup clicks to close them
      const nameInput3 = await testSubjects.find('ruleNameInput');
      await nameInput3.click();
      await testSubjects.scrollIntoView('alertVisualizationChart');
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-preview',
        screenshotDirectories,
        1400,
        1024
      );

      await testSubjects.click('.server-log-alerting-ActionTypeSelectOption');
      await testSubjects.scrollIntoView('addAlertActionButton');
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-action',
        screenshotDirectories,
        1400,
        1024
      );

      const actionFrequency = await testSubjects.find('summaryOrPerRuleSelect');
      await actionFrequency.click();
      const actionSummary = await testSubjects.find('actionNotifyWhen-option-summary');
      await actionSummary.click();
      const notifyWhen = await testSubjects.find('notifyWhenSelect');
      await notifyWhen.click();
      const customInterval = await testSubjects.find('onThrottleInterval');
      await customInterval.click();
      await testSubjects.setValue('throttleInput', '24');
      await testSubjects.scrollIntoView('addAlertActionButton');
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-action-summary',
        screenshotDirectories,
        1400,
        1024
      );

      const saveButton = await testSubjects.find('saveRuleButton');
      await saveButton.click();
      const flyOutCancelButton = await testSubjects.find('euiFlyoutCloseButton');
      await flyOutCancelButton.click();
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.setValue('ruleSearchField', ruleName);
      const rulesList = await testSubjects.find('rulesList');
      const alertRule = await rulesList.findByCssSelector(`[title="${ruleName}"]`);
      await alertRule.click();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-alerts',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });
}
