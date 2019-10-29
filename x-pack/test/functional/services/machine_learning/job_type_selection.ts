/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobTypeSelectionProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async selectSingleMetricJob() {
      await testSubjects.clickWhenNotDisabled('mlJobTypeLinkSingleMetricJob');
      await this.assertSingleMetricJobWizardOpen();
    },

    async assertSingleMetricJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard single_metric');
    },

    async selectMultiMetricJob() {
      await testSubjects.clickWhenNotDisabled('mlJobTypeLinkMultiMetricJob');
      await this.assertMultiMetricJobWizardOpen();
    },

    async assertMultiMetricJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard multi_metric');
    },

    async selectPopulationJob() {
      await testSubjects.clickWhenNotDisabled('mlJobTypeLinkPopulationJob');
      await this.assertPopulationJobWizardOpen();
    },

    async assertPopulationJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard population');
    },

    async selectAdvancedJob() {
      await testSubjects.clickWhenNotDisabled('mlJobTypeLinkAdvancedJob');
      await this.assertAdvancedJobWizardOpen();
    },

    async assertAdvancedJobWizardOpen() {
      await testSubjects.existOrFail('mlPageJobWizard advanced');
    },
  };
}
