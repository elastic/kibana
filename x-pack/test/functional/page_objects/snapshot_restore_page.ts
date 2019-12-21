/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SnapshotRestorePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  // const wait = getService('waitFor');

  return {
    async appTitleText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async registerRepositoryButton() {
      return await testSubjects.find('registerRepositoryButton');
    },
    async navToRepositories() {
      await testSubjects.click('repositories_tab');
    },
  };
}
