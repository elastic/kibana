/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const commonScreenshots = getService('commonScreenshots');
  const find = getService('find');
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
  const invalidQueryJson = JSON.stringify({
    query: {
      bool: {
        filter: [
          {
            error_clause: {
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
      await testSubjects.scrollIntoView('ruleNameInput');
      await testSubjects.setValue('ruleNameInput', ruleName);
      await testSubjects.click(`.es-query-SelectOption`);
      await testSubjects.click('queryFormType_esQuery');
      const indexSelector = await testSubjects.find('selectIndexExpression');
      await indexSelector.click();
      const indexComboBox = await find.byCssSelector('#indexSelectSearchBox');
      await indexComboBox.type('kibana_sample_data_logs ');
      const filterSelectItem = await find.byCssSelector(`.euiFilterSelectItem`);
      await filterSelectItem.click();
      await testSubjects.click('thresholdAlertTimeFieldSelect');
      await testSubjects.setValue('thresholdAlertTimeFieldSelect', '@timestamp');
      await testSubjects.click('closePopover');
      await commonScreenshots.takeScreenshot(
        'rule-types-es-query-conditions',
        screenshotDirectories,
        1400,
        1500
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
      // Test an invalid query
      await testSubjects.setValue('queryJsonEditor', '', {
        clearWithKeyboard: true,
      });
      await queryJsonEditor.clearValue();
      await testSubjects.setValue('queryJsonEditor', invalidQueryJson, {
        clearWithKeyboard: true,
      });
      await testSubjects.click('testQuery');
      await testSubjects.scrollIntoView('ruleNameInput');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'rule-types-es-query-invalid',
        screenshotDirectories,
        1400,
        1500
      );
      await testSubjects.click('cancelSaveRuleButton');
    });
  });
}
