/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

type NodeExpandedRowTab = 'mlNodesOverviewPanelMemoryTab' | 'mlNodesOverviewPanelDetailsTab';
type PageTab = 'memory-usage' | 'nodes';

export function MachineLearningMemoryUsageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');

  return {
    async assertNodeExpandedDetailsPanelsExist() {
      await testSubjects.existOrFail('mlNodesTableRowDetailsPanel');
      await testSubjects.existOrFail('mlNodesTableRowDetailsAttributesPanel');
    },

    async assertTabIsSelected(tabName: string) {
      await testSubjects.existOrFail(`mlNodesOverviewPanel ${tabName}Tab`);
    },

    async selectTab(tabName: PageTab) {
      await testSubjects.click(`mlMemoryUsageTab-${tabName}`);
    },

    async assertMemoryUsageTabsExist() {
      await testSubjects.existOrFail('mlMemoryUsageTabs');
    },

    async assertMemoryUsageTabIsSelected(tabName: string) {
      const isSelected = await testSubjects.getAttribute(
        `mlMemoryUsageTab-${tabName}`,
        'aria-selected'
      );
      expect(isSelected).to.eql('true');
    },

    async assertRowCount(expectedCount: number) {
      const rowCount = await this.getRowCount();
      expect(rowCount).to.eql(expectedCount);
    },

    async getAllRows() {
      return await testSubjects.findAll('~mlNodesTableRow');
    },

    async expandRow() {
      await testSubjects.click('mlNodesTableRowDetailsToggle');
    },

    async getRowCount() {
      const rows = await this.getAllRows();
      return rows.length;
    },

    async assertColumnHeaderExists(columnName: string) {
      await testSubjects.existOrFail(columnName);
    },

    async assertColumnIsSorted(columnName: string, sortDirection: 'ascending' | 'descending') {
      const sorted = await testSubjects.getAttribute(columnName, 'aria-sort');
      expect(sorted).to.eql(sortDirection);
    },

    async sortColumn(columnName: string) {
      await this.assertColumnHeaderExists(columnName);
      await testSubjects.click(columnName);
    },

    async assertSearchBarExists() {
      await testSubjects.existOrFail('mlNodesTableSearchInput');
    },

    async searchForNode(nodeId: string) {
      await this.assertSearchBarExists();
      await testSubjects.setValue('mlNodesTableSearchInput', nodeId);
    },

    async selectNodeExpandedRowTab(tabName: NodeExpandedRowTab) {
      await testSubjects.click(tabName);
    },

    async clearSelectedChartItems() {
      await comboBox.clear('~mlJobTreeMap > mlJobTreeMapComboBox');
    },

    async getSelectedChartItems() {
      return await comboBox.getComboBoxSelectedOptions('~mlJobTreeMap > comboBoxInput');
    },

    async assertChartItemsSelectedByDefault() {
      const selectedOptions = await this.getSelectedChartItems();
      expect(selectedOptions.length).to.be.greaterThan(0);
    },

    async assertTreeChartExists() {
      await testSubjects.existOrFail('mlJobTreeMap withData');
    },

    async assertEmptyTreeChartExists() {
      await testSubjects.existOrFail('mlJobTreeMap empty');
    },
  };
}
