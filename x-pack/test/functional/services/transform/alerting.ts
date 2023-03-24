/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformAlertingProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  return {
    async selectTransformAlertType() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('transform_health-SelectOption');
        await testSubjects.existOrFail(`transformHealthAlertingRuleForm`, { timeout: 1000 });
      });
    },

    async selectTransforms(transformIds: string[]) {
      for (const transformId of transformIds) {
        await comboBox.set('transformSelection > comboBoxInput', transformId);
      }
      await this.assertTransformSelection(transformIds);
    },

    async assertTransformSelection(expectedTransformIds: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'transformSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedTransformIds,
        `Expected job selection to be '${expectedTransformIds}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async openAddRuleVariable() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('messageAddVariableButton');
        await testSubjects.existOrFail('variableMenuButton-alert.actionGroup', { timeout: 1000 });
      });
    },

    async setRuleName(rulename: string) {
      await testSubjects.setValue('ruleNameInput', rulename);
    },

    async clickCancelSaveRuleButton() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('cancelSaveRuleButton');
        await testSubjects.existOrFail('confirmModalTitleText', { timeout: 1000 });
        await testSubjects.click('confirmModalConfirmButton');
      });
    },
  };
}
