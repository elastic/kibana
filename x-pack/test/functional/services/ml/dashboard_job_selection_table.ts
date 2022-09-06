/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export type MlDashboardJobSelectionTable = ProvidedType<
  typeof MachineLearningDashboardJobSelectionTableProvider
>;

export function MachineLearningDashboardJobSelectionTableProvider({
  getService,
}: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertJobSelectionTableExists(): Promise<void> {
      await retry.tryForTime(20 * 1000, async () => {
        await testSubjects.existOrFail('mlCustomSelectionTable', { timeout: 2000 });
      });
    },

    async assertJobSelectionTableNotExists(): Promise<void> {
      await retry.tryForTime(5000, async () => {
        await testSubjects.missingOrFail('mlCustomSelectionTable');
      });
    },

    rowSelector(jobId: string, subSelector?: string) {
      const row = `~mlCustomSelectionTable > ~row-${jobId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    },

    async assertRowExists(jobId: string): Promise<void> {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(this.rowSelector(jobId));
      });
    },

    async assertRowCheckboxExists(jobId: string) {
      await testSubjects.existOrFail(this.rowSelector(jobId, `${jobId}-checkbox`));
    },

    async getRowCheckboxCheckedState(jobId: string): Promise<boolean> {
      const subj = this.rowSelector(jobId, `${jobId}-checkbox`);
      const isSelected = await testSubjects.getAttribute(subj, 'checked');
      return isSelected === 'true';
    },

    async assertRowCheckboxCheckedState(jobId: string, expectedCheckState: boolean) {
      const actualCheckState = await this.getRowCheckboxCheckedState(jobId);
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Table row for job '${jobId}' check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async setRowCheckboxState(jobId: string, expectCheckedState: boolean) {
      const subj = this.rowSelector(jobId, `${jobId}-checkbox`);
      if ((await this.getRowCheckboxCheckedState(jobId)) !== expectCheckedState) {
        await retry.tryForTime(5 * 1000, async () => {
          await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
          await this.assertRowCheckboxCheckedState(jobId, expectCheckedState);
        });
      }
    },

    async assertApplyJobSelectionEnabled() {
      const subj = 'mlFlyoutJobSelectorButtonApply';
      await testSubjects.existOrFail(subj);
      await testSubjects.isEnabled(subj);
    },

    async applyJobSelection() {
      const subj = 'mlFlyoutJobSelectorButtonApply';
      await testSubjects.clickWhenNotDisabledWithoutRetry(subj);
      await this.assertJobSelectionTableNotExists();
    },
  };
}
