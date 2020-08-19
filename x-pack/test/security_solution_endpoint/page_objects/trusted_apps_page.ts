/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export function TrustedAppsPageProvider({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'endpointPageUtils']);

  return {
    async navigateToTrustedAppsList(searchParams?: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        `/trusted_apps${searchParams ? `?${searchParams}` : ''}`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },
  };
}
