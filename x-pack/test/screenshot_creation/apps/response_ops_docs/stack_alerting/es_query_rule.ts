/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { esQueryRuleName } from '.';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const commonScreenshots = getService('commonScreenshots');
  const comboBox = getService('comboBox');
  const rules = getService('rules');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'stack_alerting'];
  const ruleName = 'test query rule';

  const validQueryJson = JSON.stringify({
    query: {
      bool: {
        filter: [
          {
            term: {
              'host.keyword': 'www.elastic.co',
            },
          },
        ],
      },
    },
  });

  describe('elasticsearch query rule', function () {
    it('create rule screenshot', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await rules.common.clickCreateAlertButton();
      await testSubjects.setValue('ruleNameInput', ruleName);
      await testSubjects.click(`.es-query-SelectOption`);
      await testSubjects.click('queryFormType_esQuery');
      const indexSelector = await testSubjects.find('selectIndexExpression');
      await indexSelector.click();
      await comboBox.set('thresholdIndexesComboBox', 'kibana_sample_data_logs ');
      await testSubjects.click('thresholdAlertTimeFieldSelect');
      await testSubjects.setValue('thresholdAlertTimeFieldSelect', '@timestamp');
      await testSubjects.click('closePopover');
      await comboBox.set('ruleFormConsumerSelect', 'Stack Rules');
      await testSubjects.scrollIntoView('ruleNameInput');
      await commonScreenshots.takeScreenshot(
        'rule-types-es-query-conditions',
        screenshotDirectories,
        1400,
        1900
      );
      // Test a valid query
      await testSubjects.setValue('queryJsonEditor', '', {
        clearWithKeyboard: true,
      });
      const queryJsonEditor = await testSubjects.find('queryJsonEditor');
      await queryJsonEditor.clearValue();
      await testSubjects.setValue('queryJsonEditor', validQueryJson, {
        clearWithKeyboard: true,
      });
      await testSubjects.click('forLastExpression');
      await testSubjects.setValue('timeWindowSizeNumber', '1');
      await testSubjects.setValue('timeWindowUnitSelect', 'day');
      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.click('testQuery');
      await testSubjects.scrollIntoView('ruleNameInput');
      await commonScreenshots.takeScreenshot(
        'rule-types-es-query-valid',
        screenshotDirectories,
        1400,
        1500
      );
      // Create an email connector action
      await testSubjects.click('.email-alerting-ActionTypeSelectOption');
      await testSubjects.scrollIntoView('addAlertActionButton');
      await commonScreenshots.takeScreenshot(
        'es-query-rule-action-query-matched',
        screenshotDirectories,
        1400,
        1024
      );
      await testSubjects.click('messageAddVariableButton');
      await commonScreenshots.takeScreenshot(
        'es-query-rule-action-variables',
        screenshotDirectories,
        1400,
        1024
      );
      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.click('cancelSaveRuleButton');
    });

    it('example elasticsearch query rule conditions and actions', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      // Edit the rule that was created as part of startup
      await testSubjects.setValue('ruleSearchField', esQueryRuleName);
      await browser.pressKeys(browser.keys.ENTER);
      const rulesList = await testSubjects.find('rulesList');
      const alertRule = await rulesList.findByCssSelector(`[title="${esQueryRuleName}"]`);
      await alertRule.click();
      const editRule = await testSubjects.find('openEditRuleFlyoutButton');
      await editRule.click();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'es-query-rule-conditions',
        screenshotDirectories,
        1400,
        1700
      );
      /* Reposition so that the details are visible for the first action */
      await testSubjects.scrollIntoView('alertActionAccordion-0');
      await commonScreenshots.takeScreenshot(
        'es-query-rule-action-summary',
        screenshotDirectories,
        1400,
        1024
      );
      /* Reposition so that the details are visible for the second action */
      await testSubjects.scrollIntoView('alertActionAccordion-1');
      await commonScreenshots.takeScreenshot(
        'es-query-rule-recovery-action',
        screenshotDirectories,
        1400,
        1024
      );
      const cancelEditButton = await testSubjects.find('cancelSaveEditedRuleButton');
      await cancelEditButton.click();
      const confirmCancelButton = await testSubjects.find('confirmModalConfirmButton');
      await confirmCancelButton.click();
    });
  });
}
