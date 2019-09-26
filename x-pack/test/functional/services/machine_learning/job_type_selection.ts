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
      await testSubjects.existOrFail('mlPageJobWizard');
    },

    async selectMultiMetricJob() {
      await testSubjects.clickWhenNotDisabled('mlJobTypeLinkMultiMetricJob');
      await testSubjects.existOrFail('mlPageJobWizard');
    },

    async selectPopulationJob() {
      await testSubjects.clickWhenNotDisabled('mlJobTypeLinkPopulationJob');
      await testSubjects.existOrFail('mlPageJobWizard');
    },
  };
}
