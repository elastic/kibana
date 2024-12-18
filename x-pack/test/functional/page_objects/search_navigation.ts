/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SearchNavigationServiceProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const retry = getService('retry');
  const { common, indexManagement, header } = getPageObjects([
    'header',
    'common',
    'indexManagement',
  ]);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToElasticsearchStartPage(expectRedirect: boolean = false) {
      await retry.tryForTime(60 * 1000, async () => {
        await common.navigateToApp('elasticsearch/start', {
          shouldLoginIfPrompted: false,
        });
        if (!expectRedirect) {
          await testSubjects.existOrFail('elasticsearchStartPage', { timeout: 2000 });
        }
      });
    },
    async navigateToIndexDetailPage(indexName: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await common.navigateToApp(`elasticsearch/indices/index_details/${indexName}`, {
          shouldLoginIfPrompted: false,
        });
      });
      await testSubjects.existOrFail('searchIndicesDetailsPage', { timeout: 2000 });
    },
    async navigateToInferenceManagementPage(expectRedirect: boolean = false) {
      await common.navigateToApp('searchInferenceEndpoints', {
        shouldLoginIfPrompted: false,
      });
    },

    async navigateToIndexManagementPage() {
      await retry.tryForTime(10 * 1000, async () => {
        await common.navigateToApp(`indexManagement`);
        await indexManagement.changeTabs('indicesTab');
        await header.waitUntilLoadingHasFinished();
        await indexManagement.expectToBeOnIndicesManagement();
      });
    },
  };
}
