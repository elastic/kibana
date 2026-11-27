/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../configs/ftr_provider_context';

export function EndpointPolicyPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');

  return {
    /**
     * Navigates to the Endpoint Policy List page
     */
    async navigateToPolicyList() {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        `/policy`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Ensures the current page is the policy list page
     */
    async ensureIsOnListPage() {
      await testSubjects.existOrFail('policyListPage');
    },
    /**
     * ensures that the Details Page is currently displayed
     */
    async ensureIsOnDetailsPage() {
      await testSubjects.existOrFail('policyDetailsPage');
    },
  };
}
