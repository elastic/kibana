/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningCustomUrlsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertCustomUrlLabelValue(expectedValue: string) {
      const actualCustomUrlLabel = await testSubjects.getAttribute(
        'mlJobCustomUrlLabelInput',
        'value'
      );
      expect(actualCustomUrlLabel).to.eql(expectedValue);
    },

    async setCustomUrlLabel(customUrlsLabel: string) {
      await testSubjects.setValue('mlJobCustomUrlLabelInput', customUrlsLabel, {
        clearWithKeyboard: true,
      });
      await this.assertCustomUrlLabelValue(customUrlsLabel);
    },

    async assertCustomUrlItem(index: number) {
      await testSubjects.existOrFail(`mlJobEditCustomUrlInput_${index}`);
    },

    async addCustomUrl() {
      await testSubjects.click('mlJobAddCustomUrl');
    },
  };
}
