/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../ftr_provider_context';

interface Policy {
  policyName: string;
  warmEnabled?: boolean;
  coldEnabled?: boolean;
  frozenEnabled?: boolean;
  deleteEnabled?: boolean;
  snapshotRepository?: string;
  minAges?: { [key: string]: { value: string; unit: string } };
}

export function IndexLifecycleManagementPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async pageHeaderText() {
      return await testSubjects.getVisibleText('ilmPageHeader');
    },
    async createPolicyButton() {
      return await testSubjects.find('createPolicyButton');
    },
    async clickCreatePolicyButton() {
      return await testSubjects.click('createPolicyButton');
    },
    async fillNewPolicyForm(policy: Policy) {
      const {
        policyName,
        warmEnabled = false,
        coldEnabled = false,
        frozenEnabled = false,
        deleteEnabled = false,
        snapshotRepository = 'test',
        minAges = {
          warm: { value: '10', unit: 'd' },
          cold: { value: '15', unit: 'd' },
          frozen: { value: '20', unit: 'd' },
        },
      } = policy;

      await testSubjects.setValue('policyNameField', policyName);
      if (warmEnabled) {
        await retry.try(async () => {
          await testSubjects.click('enablePhaseSwitch-warm');
        });
        await testSubjects.setValue('warm-selectedMinimumAge', minAges.warm.value);
      }
      if (coldEnabled) {
        await retry.try(async () => {
          await testSubjects.click('enablePhaseSwitch-cold');
        });
        await testSubjects.setValue('cold-selectedMinimumAge', minAges.cold.value);
      }
      if (frozenEnabled) {
        await retry.try(async () => {
          await testSubjects.click('enablePhaseSwitch-frozen');
        });
        await testSubjects.setValue('frozen-selectedMinimumAge', minAges.frozen.value);
        await testSubjects.setValue('searchableSnapshotCombobox', snapshotRepository);
      }
      if (deleteEnabled) {
        await retry.try(async () => {
          await testSubjects.click('enableDeletePhaseButton');
        });
      }
    },
    async saveNewPolicy() {
      await testSubjects.click('savePolicyButton');
    },
    async createNewPolicyAndSave(policy: Policy) {
      await testSubjects.click('createPolicyButton');
      await this.fillNewPolicyForm(policy);
      await this.saveNewPolicy();
    },

    async increasePolicyListPageSize() {
      await testSubjects.click('tablePaginationPopoverButton');
      await testSubjects.click(`tablePagination-50-rows`);
    },

    async getPolicyRow(name: string) {
      return await testSubjects.findAll(`policyTableRow-${name}`);
    },
  };
}
