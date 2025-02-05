/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export function SearchNavigationProvider({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const { common, indexManagement, header } = getPageObjects([
    'common',
    'indexManagement',
    'header',
  ]);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToElasticsearchOverviewPage(basePath?: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await common.navigateToApp('enterpriseSearch', {
          shouldLoginIfPrompted: false,
          basePath,
        });
      });
    },
    async navigateToElasticsearchStartPage(expectRedirect: boolean = false, basePath?: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await common.navigateToApp('elasticsearchStart', {
          basePath,
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
