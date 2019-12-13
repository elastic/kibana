/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test/types/ftr';

import { FtrProviderContext } from '../../ftr_provider_context';

export type MlCustomUrls = ProvidedType<typeof MachineLearningCustomUrlsProvider>;

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

    async assertCustomUrlItem(index: number, label: string) {
      await testSubjects.existOrFail(`mlJobEditCustomUrlItem_${index}`);
      expect(
        await testSubjects.getAttribute(`mlJobEditCustomUrlLabelInput_${index}`, 'value')
      ).to.eql(label);
    },

    /**
     * Submits the custom url form and adds it to the list.
     * @param formContainerSelector - selector for the element that wraps the custom url creation form.
     */
    async saveCustomUrl(formContainerSelector: string) {
      await testSubjects.click('mlJobAddCustomUrl');
      await testSubjects.missingOrFail(formContainerSelector, { timeout: 10 * 1000 });
    },
  };
}
