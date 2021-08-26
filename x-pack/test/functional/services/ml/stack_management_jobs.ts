/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlADJobTable } from './job_table';
import { MlDFAJobTable } from './data_frame_analytics_table';

type SyncFlyoutObjectType =
  | 'MissingObjects'
  | 'UnmatchedObjects'
  | 'ObjectsMissingDatafeed'
  | 'ObjectsUnmatchedDatafeed';

export function MachineLearningStackManagementJobsProvider(
  { getService }: FtrProviderContext,
  mlADJobTable: MlADJobTable,
  mlDFAJobTable: MlDFAJobTable
) {
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  return {
    async openSyncFlyout() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('mlStackMgmtSyncButton', 1000);
        await testSubjects.existOrFail('mlJobMgmtSyncFlyout');
      });
    },

    async closeSyncFlyout() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('mlJobMgmtSyncFlyoutCloseButton', 1000);
        await testSubjects.missingOrFail('mlJobMgmtSyncFlyout');
      });
    },

    async assertSyncFlyoutSyncButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlJobMgmtSyncFlyoutSyncButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected Stack Management job sync flyout "Synchronize" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async getSyncFlyoutObjectCountFromTitle(objectType: SyncFlyoutObjectType): Promise<number> {
      const titleText = await testSubjects.getVisibleText(`mlJobMgmtSyncFlyout${objectType}Title`);

      const pattern = /^.* \((\d+)\)$/;
      const matches = titleText.match(pattern);
      expect(matches).to.not.eql(
        null,
        `Object title text should match pattern '${pattern}', got ${titleText}`
      );
      const count: number = +matches![1];

      return count;
    },

    async assertSyncFlyoutObjectCounts(expectedCounts: Map<SyncFlyoutObjectType, number>) {
      for (const [objectType, expectedCount] of expectedCounts) {
        const actualObjectCount = await this.getSyncFlyoutObjectCountFromTitle(objectType);
        expect(actualObjectCount).to.eql(
          expectedCount,
          `Expected ${objectType} count to be ${expectedCount}, got ${actualObjectCount}`
        );
      }
    },

    async executeSync() {
      await testSubjects.click('mlJobMgmtSyncFlyoutSyncButton', 2000);

      // check and close success toast
      const resultToast = await toasts.getToastElement(1);
      const titleElement = await testSubjects.findDescendant('euiToastHeader', resultToast);
      const title: string = await titleElement.getVisibleText();
      expect(title).to.match(/^\d+ job[s]? synchronized$/);

      const dismissButton = await testSubjects.findDescendant('toastCloseButton', resultToast);
      await dismissButton.click();
    },

    async assertADJobRowSpaces(adJobId: string, expectedSpaces: string[]) {
      await mlADJobTable.refreshJobList();
      const rows = await mlADJobTable.parseJobTable('stackMgmtJobList');
      const jobRow = rows.filter((row) => row.id === adJobId)[0];
      expect(jobRow).to.have.property('spaces');
      expect(jobRow.spaces!.sort()).to.eql(
        expectedSpaces.sort(),
        `Expected spaces for AD job '${adJobId}' to be '${JSON.stringify(
          expectedSpaces
        )}' (got '${JSON.stringify(jobRow.spaces)}')`
      );
    },

    async assertDFAJobRowSpaces(dfaJobId: string, expectedSpaces: string[]) {
      await mlDFAJobTable.refreshAnalyticsTable();
      const rows = await mlDFAJobTable.parseAnalyticsTable('stackMgmtJobList');
      const jobRow = rows.filter((row) => row.id === dfaJobId)[0];
      expect(jobRow).to.have.property('spaces');
      expect(jobRow.spaces!.sort()).to.eql(
        expectedSpaces.sort(),
        `Expected spaces for DFA job '${dfaJobId}' to be '${JSON.stringify(
          expectedSpaces
        )}' (got '${JSON.stringify(jobRow.spaces)}')`
      );
    },

    async openADJobSpacesFlyout(adJobId: string) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click(
          mlADJobTable.rowSelector(adJobId, 'mlJobListRowManageSpacesButton'),
          1000
        );
        await testSubjects.existOrFail('share-to-space-flyout', { timeout: 2000 });
      });
    },

    async openDFAJobSpacesFlyout(dfaJobId: string) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click(
          mlDFAJobTable.rowSelector(dfaJobId, 'mlJobListRowManageSpacesButton'),
          1000
        );
        await testSubjects.existOrFail('share-to-space-flyout', { timeout: 2000 });
      });
    },

    async saveAndCloseSpacesFlyout() {
      await testSubjects.clickWhenNotDisabled('sts-save-button', { timeout: 2000 });
      await testSubjects.missingOrFail('share-to-space-flyout', { timeout: 2000 });
    },

    async selectShareToSpacesMode(inputTestSubj: 'shareToExplicitSpacesId' | 'shareToAllSpacesId') {
      await retry.tryForTime(5000, async () => {
        // The input element can not be clicked directly.
        // Instead, we need to click the corresponding label
        const inputId = await testSubjects.getAttribute(inputTestSubj, 'id', 1000);
        const labelElement = await find.byCssSelector(`[for="${inputId}"]`, 1000);
        await labelElement.click();

        const checked = await testSubjects.getAttribute(inputTestSubj, 'checked', 1000);
        expect(checked).to.eql('true', `Input '${inputTestSubj}' should be checked`);

        // sometimes the checked attribute of the input is set but it's not actually
        // selected, so we're also checking the class of the corresponding label
        const updatedLabelElement = await find.byCssSelector(`[for="${inputId}"]`, 1000);
        const labelClasses = await updatedLabelElement.getAttribute('class');
        expect(labelClasses).to.contain(
          'euiButtonGroupButton-isSelected',
          `Label for '${inputTestSubj}' should be selected`
        );
      });
    },

    async selectShareToExplicitSpaces() {
      await this.selectShareToSpacesMode('shareToExplicitSpacesId');
    },

    async selectShareToAllSpaces() {
      await this.selectShareToSpacesMode('shareToAllSpacesId');
    },

    async isSpaceSelectionRowSelected(spaceId: string): Promise<boolean> {
      const state = await testSubjects.getAttribute(
        `sts-space-selector-row-${spaceId}`,
        'aria-selected',
        1000
      );
      return state === 'true';
    },

    async assertSpaceSelectionRowSelected(spaceId: string, shouldBeSelected: boolean) {
      const isSelected = await this.isSpaceSelectionRowSelected(spaceId);
      expect(isSelected).to.eql(
        shouldBeSelected,
        `Space selection row for '${spaceId}' should${shouldBeSelected ? '' : ' not'} be selected`
      );
    },

    async toggleSpaceSelectionRow(spaceId: string, shouldSelect: boolean) {
      const isSelected = await this.isSpaceSelectionRowSelected(spaceId);
      if (isSelected !== shouldSelect) {
        await testSubjects.click(`sts-space-selector-row-${spaceId}`, 1000);
      }
      await this.assertSpaceSelectionRowSelected(spaceId, shouldSelect);
    },
  };
}
