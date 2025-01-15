/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SvlSearchNavigationServiceProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToLandingPage() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('landingPage');
        // Wait for the side nav, since the landing page will sometimes redirect to index management now
        await testSubjects.existOrFail('svlSearchSideNav', { timeout: 2000 });
      });
    },
    async navigateToGettingStartedPage() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('serverlessElasticsearch');
        await testSubjects.existOrFail('svlSearchOverviewPage', { timeout: 2000 });
      });
    },
    async navigateToElasticsearchStartPage(expectRedirect: boolean = false) {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('elasticsearchStart', {
          shouldLoginIfPrompted: false,
        });
        if (!expectRedirect) {
          await testSubjects.existOrFail('elasticsearchStartPage', { timeout: 2000 });
        }
      });
    },
    async navigateToIndexDetailPage(indexName: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp(`elasticsearch/indices/index_details/${indexName}`, {
          shouldLoginIfPrompted: false,
        });
      });
      await testSubjects.existOrFail('searchIndicesDetailsPage', { timeout: 2000 });
    },
    async navigateToInferenceManagementPage(expectRedirect: boolean = false) {
      await PageObjects.common.navigateToApp('searchInferenceEndpoints', {
        shouldLoginIfPrompted: false,
      });
    },
  };
}
