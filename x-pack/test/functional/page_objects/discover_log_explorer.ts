/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function DiscoverLogExplorerPageObject({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  return {
    async getDatasetSelectorButton() {
      return testSubjects.find('dataset-selector-popover-button');
    },

    async getDatasetSelectorButtonText() {
      const button = await this.getDatasetSelectorButton();
      return button.getVisibleText();
    },

    async assertRestoreFailureToastExist() {
      const successToast = await toasts.getToastElement(1);
      expect(await successToast.getVisibleText()).to.contain(
        "We couldn't restore your datasets selection"
      );
    },
  };
}
