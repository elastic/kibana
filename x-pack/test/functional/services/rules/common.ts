/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export type RulesCommon = ProvidedType<typeof RulesCommonServiceProvider>;

export function RulesCommonServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const retry = getService('retry');
  const browser = getService('browser');

  return {
    async clickCreateAlertButton() {
      const createBtn = await find.byCssSelector(
        '[data-test-subj="createRuleButton"],[data-test-subj="createFirstRuleButton"]'
      );
      await createBtn.click();
    },

    async cancelRuleCreation() {
      await testSubjects.click('cancelSaveRuleButton');
      await testSubjects.existOrFail('confirmRuleCloseModal');
      await testSubjects.click('confirmRuleCloseModal > confirmModalConfirmButton');
      await testSubjects.missingOrFail('confirmRuleCloseModal');
    },

    async setNotifyThrottleInput(value: string = '10') {
      await testSubjects.click('notifyWhenSelect');
      await testSubjects.click('onThrottleInterval');
      await testSubjects.setValue('throttleInput', value);
    },

    async defineIndexThresholdAlert(alertName: string) {
      await browser.refresh();
      await this.clickCreateAlertButton();
      await testSubjects.click(`.index-threshold-SelectOption`);
      await testSubjects.scrollIntoView('ruleNameInput');
      await testSubjects.setValue('ruleNameInput', alertName);
      await testSubjects.scrollIntoView('selectIndexExpression');
      await testSubjects.click('selectIndexExpression');
      await comboBox.set('thresholdIndexesComboBox', 'k');
      await testSubjects.click('thresholdAlertTimeFieldSelect');
      await retry.try(async () => {
        const fieldOptions = await find.allByCssSelector('#thresholdTimeField option');
        expect(fieldOptions[1]).not.to.be(undefined);
        await fieldOptions[1].click();
      });
      await testSubjects.click('closePopover');
      // need this two out of popup clicks to close them
      const nameInput = await testSubjects.find('ruleNameInput');
      await nameInput.click();

      await testSubjects.click('whenExpression');
      await testSubjects.click('whenExpressionSelect');
      await retry.try(async () => {
        const aggTypeOptions = await find.allByCssSelector('#aggTypeField option');
        expect(aggTypeOptions[1]).not.to.be(undefined);
        await aggTypeOptions[1].click();
      });

      await testSubjects.click('ofExpressionPopover');
      const ofComboBox = await find.byCssSelector('#ofField');
      await ofComboBox.click();
      const ofOptionsString = await comboBox.getOptionsList('availablefieldsOptionsComboBox');
      const ofOptions = ofOptionsString.trim().split('\n');
      expect(ofOptions.length > 0).to.be(true);
      await comboBox.set('availablefieldsOptionsComboBox', ofOptions[0]);
    },
  };
}
