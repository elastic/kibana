/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningAnomaliesTableProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertTableExists() {
      await testSubjects.existOrFail('mlAnomaliesTable');
    },

    async getTableRows() {
      return await testSubjects.findAll('mlAnomaliesTable > ~mlAnomaliesListRow');
    },

    async getRowSubjByRowIndex(rowIndex: number) {
      const tableRows = await this.getTableRows();
      expect(tableRows.length).to.be.greaterThan(
        rowIndex,
        `Expected anomalies table to have at least ${rowIndex + 1} rows (got ${
          tableRows.length
        } rows)`
      );
      const row = tableRows[rowIndex];
      const rowSubj = await row.getAttribute('data-test-subj');

      return rowSubj;
    },

    async assertTableNotEmpty() {
      const tableRows = await this.getTableRows();
      expect(tableRows.length).to.be.greaterThan(
        0,
        `Anomalies table should have at least one row (got '${tableRows.length}')`
      );
    },

    async assertAnomalyActionsMenuButtonExists(rowIndex: number) {
      const rowSubj = await this.getRowSubjByRowIndex(rowIndex);
      await testSubjects.existOrFail(`${rowSubj} > mlAnomaliesListRowActionsButton`);
    },

    async assertAnomalyActionsMenuButtonNotExists(rowIndex: number) {
      const rowSubj = await this.getRowSubjByRowIndex(rowIndex);
      await testSubjects.missingOrFail(`${rowSubj} > mlAnomaliesListRowActionsButton`);
    },

    async assertAnomalyActionsMenuButtonEnabled(rowIndex: number, expectedValue: boolean) {
      const rowSubj = await this.getRowSubjByRowIndex(rowIndex);
      const isEnabled = await testSubjects.isEnabled(
        `${rowSubj} > mlAnomaliesListRowActionsButton`
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected actions menu button for anomalies list entry  #${rowIndex} to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async ensureAnomalyActionsMenuOpen(rowIndex: number) {
      await retry.tryForTime(30 * 1000, async () => {
        const rowSubj = await this.getRowSubjByRowIndex(rowIndex);
        if (!(await testSubjects.exists('mlAnomaliesListRowActionsMenu'))) {
          await testSubjects.click(`${rowSubj} > mlAnomaliesListRowActionsButton`);
          await testSubjects.existOrFail('mlAnomaliesListRowActionsMenu', { timeout: 5000 });
        }
      });
    },

    async assertAnomalyActionConfigureRulesButtonExists(rowIndex: number) {
      await this.ensureAnomalyActionsMenuOpen(rowIndex);
      await testSubjects.existOrFail('mlAnomaliesListRowActionConfigureRulesButton');
    },

    async assertAnomalyActionConfigureRulesButtonNotExists(rowIndex: number) {
      await this.ensureAnomalyActionsMenuOpen(rowIndex);
      await testSubjects.missingOrFail('mlAnomaliesListRowActionConfigureRulesButton');
    },

    async assertAnomalyActionConfigureRulesButtonEnabled(rowIndex: number, expectedValue: boolean) {
      await this.ensureAnomalyActionsMenuOpen(rowIndex);
      const isEnabled = await testSubjects.isEnabled(
        'mlAnomaliesListRowActionConfigureRulesButton'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "configure rules" action button for anomalies list entry  #${rowIndex} to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertAnomalyActionViewSeriesButtonEnabled(rowIndex: number, expectedValue: boolean) {
      await this.ensureAnomalyActionsMenuOpen(rowIndex);
      const isEnabled = await testSubjects.isEnabled('mlAnomaliesListRowActionViewSeriesButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "view series" action button for anomalies list entry  #${rowIndex} to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },
  };
}
