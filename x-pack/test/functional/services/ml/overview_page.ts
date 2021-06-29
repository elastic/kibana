/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningOverviewPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertADCreateJobButtonExists() {
      await testSubjects.existOrFail('mlOverviewCreateADJobButton');
    },

    async assertADCreateJobButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlOverviewCreateADJobButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD "Create job" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertDFACreateJobButtonExists() {
      await testSubjects.existOrFail('mlOverviewCreateDFAJobButton');
    },

    async assertDFACreateJobButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlOverviewCreateDFAJobButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD "Create job" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },
  };
}
