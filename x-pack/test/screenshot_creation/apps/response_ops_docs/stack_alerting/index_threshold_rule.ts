/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const find = getService('find');
  const retry = getService('retry');
  const rules = getService('rules');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'stack_alerting'];

  describe('index threshold rule', function () {
    it('create rule screenshot', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await rules.common.clickCreateAlertButton();
      await testSubjects.setValue('ruleNameInput', 'kibana sites - high egress');
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
        1024
      );

      await testSubjects.scrollIntoView('selectIndexExpression');
      await testSubjects.click('selectIndexExpression');
      const indexComboBox = await find.byCssSelector('#indexSelectSearchBox');
      await indexComboBox.click();
      await indexComboBox.type('kibana_sample_data_logs ');
      const filterSelectItem = await find.byCssSelector(`.euiFilterSelectItem`);
      await filterSelectItem.click();
      await testSubjects.click('thresholdAlertTimeFieldSelect');
      await retry.try(async () => {
        const fieldOptions = await find.allByCssSelector('#thresholdTimeField option');
        expect(fieldOptions[1]).not.to.be(undefined);
        await fieldOptions[1].click();
      });
      await commonScreenshots.takeScreenshot(
        'rule-types-index-threshold-example-index',
        screenshotDirectories,
        1400,
        1024
      );
      await testSubjects.click('closePopover');
      const flyOutCancelButton = await testSubjects.find('euiFlyoutCloseButton');
      await flyOutCancelButton.click();
    });
  });
}
