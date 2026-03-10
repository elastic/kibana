/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../configs/ftr_provider_context';

export function ArtifactEntriesListPageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'endpointPageUtils']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToList(artifactType: string, searchParams?: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        `/${artifactType}${searchParams ? `?${searchParams}` : ''}`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    // /**
    //  * ensures that the ArtifactType page is the currently display view
    //  */
    async ensureIsOnArtifactTypePage(artifactTypePage: string) {
      await testSubjects.existOrFail(`${artifactTypePage}-container`);
    },

    // /**
    //  * Clicks on the actions menu icon in the (only one) ArtifactType card to show the popup with list of actions
    //  */
    async clickCardActionMenu(artifactTypePage: string) {
      await testSubjects.existOrFail(`${artifactTypePage}-container`);
      await testSubjects.click(`${artifactTypePage}-card-header-actions-button`);
    },
  };
}
