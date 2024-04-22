/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const actions = getService('actions');
  const browser = getService('browser');
  const commonScreenshots = getService('commonScreenshots');
  const testSubjects = getService('testSubjects');
  const transform = getService('transform');
  const screenshotDirectories = ['transform_docs'];
  const pageObjects = getPageObjects(['triggersActionsUI']);

  let testTransformId = '';

  describe('transform alerts', function () {
    before(async () => {
      await browser.setWindowSize(1920, 1080);
      await actions.api.createConnector({
        name: 'server-log-connector',
        config: {},
        secrets: {},
        connectorTypeId: '.server-log',
      });
    });

    after(async () => {
      await actions.api.deleteAllConnectors();
    });

    it('transform rule screenshot', async () => {
      await transform.testExecution.logTestStep('navigate to stack management rules');
      await transform.navigation.navigateToRules();
      await pageObjects.triggersActionsUI.clickCreateAlertButton();
      await transform.alerting.setRuleName('transform-health-rule');

      await transform.testExecution.logTestStep(
        'search for transform rule type and take screenshot'
      );
      const searchBox = await testSubjects.find('ruleSearchField');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type('transform');
      await searchBox.pressKeys(browser.keys.ENTER);
      await commonScreenshots.takeScreenshot('transform-rule', screenshotDirectories);

      await transform.testExecution.logTestStep('select transform details and take screenshot');
      await transform.alerting.selectTransformAlertType();
      testTransformId = '*';
      await transform.alerting.selectTransforms([testTransformId]);
      await commonScreenshots.takeScreenshot('transform-check-config', screenshotDirectories);

      await transform.testExecution.logTestStep(
        'add server log connector and take action variable screenshot'
      );
      await testSubjects.click('.server-log-alerting-ActionTypeSelectOption');
      await transform.alerting.openAddRuleVariable();
      await commonScreenshots.takeScreenshot('transform-alert-actions', screenshotDirectories);
      await transform.testExecution.logTestStep('set summary action frequency and take screenshot');
      const actionFrequency = await testSubjects.find('summaryOrPerRuleSelect');
      await actionFrequency.click();
      const actionSummary = await testSubjects.find('actionNotifyWhen-option-summary');
      await actionSummary.click();
      await commonScreenshots.takeScreenshot(
        'transform-alert-summary-actions',
        screenshotDirectories
      );
      await transform.alerting.clickCancelSaveRuleButton();
    });
  });
}
