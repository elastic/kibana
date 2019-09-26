/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraMetricExplorerProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async getSaveViewButton() {
      return await testSubjects.find('openSaveViewModal');
    },

    async getLoadViewsButton() {
      return await testSubjects.find('loadViews');
    },

    async openSaveViewsFlyout() {
      return await testSubjects.click('loadViews');
    },

    async closeSavedViewFlyout() {
      return await testSubjects.click('cancelSavedViewModal');
    },

    async openCreateSaveViewModal() {
      return await testSubjects.click('openSaveViewModal');
    },

    async openEnterViewNameAndSave() {
      await testSubjects.setValue('savedViewViweName', 'View1');
      await testSubjects.click('createSavedViewButton');
    },
  };
}
