/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function BlocklistPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'endpointPageUtils']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToList(searchParams?: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        `/blocklist${searchParams ? `?${searchParams}` : ''}`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    // /**
    //  * ensures that the blocklist page is the currently display view
    //  */
    async ensureIsOnBlocklistPage() {
      await testSubjects.existOrFail('blocklistPage-container');
    },

    // /**
    //  * Clicks on the actions menu icon in the (only one) blocklist card to show the popup with list of actions
    //  */
    async clickCardActionMenu() {
      await testSubjects.existOrFail('blocklistPage-container');
      await testSubjects.click('blocklistPage-card-header-actions-button');
    },
  };
}
