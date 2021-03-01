/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function IndexLifecycleManagementPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async sectionHeadingText() {
      return await testSubjects.getVisibleText('sectionHeading');
    },
    async createPolicyButton() {
      return await testSubjects.find('createPolicyButton');
    },
    async fillNewPolicyForm(
      policyName: string,
      warmEnabled: boolean = false,
      coldEnabled: boolean = false,
      deletePhaseEnabled: boolean = false
    ) {
      await testSubjects.setValue('policyNameField', policyName);
      if (warmEnabled) {
        await retry.try(async () => {
          await testSubjects.click('enablePhaseSwitch-warm');
        });
      }
      if (coldEnabled) {
        await retry.try(async () => {
          await testSubjects.click('enablePhaseSwitch-cold');
        });
      }
      if (deletePhaseEnabled) {
        await retry.try(async () => {
          await testSubjects.click('enableDeletePhaseButton');
        });
      }
    },
    async saveNewPolicy() {
      await testSubjects.click('savePolicyButton');
    },
    async createNewPolicyAndSave(
      policyName: string,
      warmEnabled: boolean = false,
      coldEnabled: boolean = false,
      deletePhaseEnabled: boolean = false
    ) {
      await this.fillNewPolicyForm(policyName, warmEnabled, coldEnabled, deletePhaseEnabled);
      await this.saveNewPolicy();
    },
  };
}
