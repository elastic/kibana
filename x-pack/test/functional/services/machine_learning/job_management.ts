/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';

export function MachineLearningJobManagementProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async getJobsTable(): Promise<WebElementWrapper> {
      const tableContainer = await testSubjects.find('mlJobListTable');
      return await tableContainer.findByTagName('table');
    },

    async isJobsTableLoadingIndicatorDisplayed(): Promise<boolean> {
      const mlJobListTable = await testSubjects.find('mlJobListTable');
      const innerText = await mlJobListTable.getVisibleText();
      return innerText.includes('Loading jobs...');
    },

    async isNoItemsFoundMessageDisplayed(): Promise<boolean> {
      const mlJobListTable = await testSubjects.find('mlJobListTable');
      const innerText = await mlJobListTable.getVisibleText();
      return innerText.includes('No jobs found');
    },

    async navigateToNewJobSourceSelection() {
      await testSubjects.clickWhenNotDisabled('mlCreateNewJobButton');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },

    async assertJobTableExists() {
      await testSubjects.existOrFail('mlJobListTable');
    },

    async assertCreateNewJobButtonExists() {
      await testSubjects.existOrFail('mlCreateNewJobButton');
    },

    async assertJobStatsBarExists() {
      await testSubjects.existOrFail('mlJobStatsBar');
    },

    async waitForJobsTableToLoad() {
      await retry.waitFor(
        'jobs table to exist',
        async () => await testSubjects.exists('mlJobListTable')
      );

      await retry.waitFor(
        'jobs table loading indicator to be invisible',
        async () => (await this.isJobsTableLoadingIndicatorDisplayed()) === false
      );
    },

    async filterJobsTable(jobId: string) {
      await this.waitForJobsTableToLoad();
      const searchBar = await testSubjects.find('mlJobListSearchBar');
      const searchBarInput = await searchBar.findByTagName('input');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(jobId);
    },

    async getJobRowByJobId(jobId: string): Promise<WebElementWrapper> {
      const table = await this.getJobsTable();
      return await table.findByCssSelector(`[data-row-id=${jobId}]`);
    },
  };
}
