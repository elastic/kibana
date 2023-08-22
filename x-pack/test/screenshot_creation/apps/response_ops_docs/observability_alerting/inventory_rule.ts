/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { inventoryRuleName } from '.';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const observability = getService('observability');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'observability_alerting'];
  const testSubjects = getService('testSubjects');

  describe('inventory rule', function () {
    it('rule detail screenshots', async () => {
      await observability.alerts.common.navigateToRulesPage();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.setValue('ruleSearchField', inventoryRuleName);
      const rulesList = await testSubjects.find('rulesList');
      const alertRule = await rulesList.findByCssSelector(`[title="${inventoryRuleName}"]`);
      await alertRule.click();
      const actionsButton = await testSubjects.find('actions');
      await actionsButton.click();
      const editButton = await testSubjects.find('editRuleButton');
      await editButton.click();
      const runWhen = await testSubjects.find('addNewActionConnectorActionGroup-0');
      await runWhen.click();
      /* Reposition so that the connector details are visible */
      await testSubjects.scrollIntoView('alertActionAccordion-0');
      await commonScreenshots.takeScreenshot(
        'infrastructure-threshold-run-when-selection',
        screenshotDirectories,
        1400,
        1024
      );
      await testSubjects.click('messageAddVariableButton');
      await commonScreenshots.takeScreenshot(
        'infrastructure-threshold-alert-default-message',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });
}
