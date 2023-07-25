/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointArtifactPageId } from './page_reference';

const artifactPageTopTestSubjPrefix: Readonly<Record<EndpointArtifactPageId, string>> = {
  trustedApps: 'trustedAppsListPage',
  eventFilters: 'EventFiltersListPage',
  hostIsolationExceptions: 'hostIsolationExceptionsListPage',
  blocklist: 'blocklistPage',
};

export const getArtifactListEmptyStateAddButton = (
  artifactType: keyof typeof artifactPageTopTestSubjPrefix
): Cypress.Chainable => {
  return cy.getByTestSubj(`${artifactPageTopTestSubjPrefix[artifactType]}-emptyState-addButton`);
};
