/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function TrustedAppsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'endpointPageUtils']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToTrustedAppsList(searchParams?: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        `/trusted_apps${searchParams ? `?${searchParams}` : ''}`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * ensures that the Policy Page is the currently display view
     */
    async ensureIsOnTrustedAppsListPage() {
      await testSubjects.existOrFail('trustedAppsListPage-list');
    },

    async ensureIsOnTrustedAppsEmptyPage() {
      await testSubjects.existOrFail('trustedAppsListPage-emptyState');
    },

    /**
     * Returns the Back button displayed on the Trusted Apps list page when page is loaded
     * with route state that triggers return button to be displayed
     */
    async findTrustedAppsListPageBackButton() {
      await this.ensureIsOnTrustedAppsListPage();
      return testSubjects.find('backToOrigin');
    },

    /**
     * Clicks on the actions menu icon in the (only one) truated app card to show the popup with list of actions
     */
    async clickCardActionMenu() {
      await this.ensureIsOnTrustedAppsListPage();
      await testSubjects.click('trustedAppsListPage-card-header-actions-button');
    },
  };
}
