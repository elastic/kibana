/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobTypeSelectionProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async selectSingleMetricJob() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkSingleMetricJob');
      await this.assertSingleMetricJobWizardOpen();
    },

    async assertSingleMetricJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard single_metric');
    },

    async selectMultiMetricJob() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkMultiMetricJob');
      await this.assertMultiMetricJobWizardOpen();
    },

    async assertMultiMetricJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard multi_metric');
    },

    async selectPopulationJob() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkPopulationJob');
      await this.assertPopulationJobWizardOpen();
    },

    async assertPopulationJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard population');
    },

    async selectAdvancedJob() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkAdvancedJob');
      await this.assertAdvancedJobWizardOpen();
    },

    async assertAdvancedJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard advanced');
    },

    async selectCategorizationJob() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobTypeLinkCategorizationJob');
      await this.assertCategorizationJobWizardOpen();
    },

    async assertCategorizationJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard categorization');
    },
  };
}
