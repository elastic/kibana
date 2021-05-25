/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { map as mapAsync } from 'bluebird';
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
      deletePhaseEnabled: boolean = false,
      minAges: { [key: string]: { value: string; unit: string } } = {
        warm: { value: '10', unit: 'd' },
        cold: { value: '15', unit: 'd' },
        frozen: { value: '20', unit: 'd' },
      }
    ) {
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
      deletePhaseEnabled: boolean = false,
      minAges?: { [key: string]: { value: string; unit: string } }
    ) {
      await testSubjects.click('createPolicyButton');
      await this.fillNewPolicyForm(
        policyName,
        warmEnabled,
        coldEnabled,
        deletePhaseEnabled,
        minAges
      );
      await this.saveNewPolicy();
    },

    async increasePolicyListPageSize() {
      await testSubjects.click('tablePaginationPopoverButton');
      await testSubjects.click(`tablePagination-100-rows`);
    },

    async getPolicyList() {
      const policies = await testSubjects.findAll('policyTableRow');
      return mapAsync(policies, async (policy) => {
        const policyNameElement = await policy.findByTestSubject('policyTableCell-name');
        const policyLinkedIndicesElement = await policy.findByTestSubject(
          'policyTableCell-linkedIndices'
        );
        const policyVersionElement = await policy.findByTestSubject('policyTableCell-version');
        const policyModifiedDateElement = await policy.findByTestSubject(
          'policyTableCell-modified_date'
        );
        const policyActionsButtonElement = await policy.findByTestSubject(
          'policyActionsContextMenuButton'
        );

        return {
          name: await policyNameElement.getVisibleText(),
          linkedIndices: await policyLinkedIndicesElement.getVisibleText(),
          version: await policyVersionElement.getVisibleText(),
          modifiedDate: await policyModifiedDateElement.getVisibleText(),
          actionsButton: policyActionsButtonElement,
        };
      });
    },
  };
}
