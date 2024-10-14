/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';

export function LogEntryRatePageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['infraLogs']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateTo() {
      await pageObjects.infraLogs.navigateToTab('log-rate');
    },

    async getSetupScreen(): Promise<WebElementWrapper> {
      return await testSubjects.find('logEntryRateSetupPage');
    },

    async getResultsScreen(): Promise<WebElementWrapper> {
      return await testSubjects.find('logEntryRateResultsPage');
    },

    async getNoDataScreen() {
      return await testSubjects.find('noDataPage');
    },

    getNoMlReadPrivilegesPrompt() {
      return testSubjects.find('logsMissingMLReadPrivileges');
    },

    getNoMlAllPrivilegesPrompt() {
      return testSubjects.find('logsMissingMLAllPrivileges');
    },

    async startJobSetup() {
      await testSubjects.click('infraLogEntryRateSetupContentMlSetupButton');
    },

    async manageMlJobs() {
      await testSubjects.click('infraManageJobsButtonManageMlJobsButton');
    },

    async getSetupFlyout(): Promise<WebElementWrapper> {
      return await testSubjects.find('infraLogAnalysisSetupFlyout');
    },

    async startRateJobCreation() {
      const buttons = await testSubjects.findAll('infraCreateJobButtonButton');
      await buttons[0].click();
    },

    async startCategoriesCountJobCreation() {
      const buttons = await testSubjects.findAll('infraCreateJobButtonButton');
      await buttons[1].click();
    },

    async canCreateJob() {
      const createJobButton = await testSubjects.find('infraCreateMLJobsButtonCreateMlJobButton');
      const disabled = await createJobButton.getAttribute('disabled');
      return disabled !== 'true';
    },

    async createJob() {
      await testSubjects.click('infraCreateMLJobsButtonCreateMlJobButton');
    },

    async canRecreateJob() {
      const createJobButton = await testSubjects.find(
        'infraRecreateMLJobsButtonRecreateMlJobsButton'
      );
      const disabled = await createJobButton.getAttribute('disabled');
      return disabled !== 'true';
    },

    async recreateJob() {
      await testSubjects.click('infraRecreateMLJobsButtonRecreateMlJobsButton');
    },

    async jobCreationDone() {
      return await testSubjects.exists('infraProcessStepViewResultsButton');
    },
  };
}
