/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from '../tasks/common';

export const loadEndpointDetailsFlyout = (endpointId: string) =>
  loadPage(
    `/app/security/administration/endpoints?page_index=0&page_size=10&selected_endpoint=${endpointId}&show=details`
  );

export const workflowInsightsSelectors = {
  insightsComponentExists: () => cy.getByTestSubj('endpointDetailsInsightsWrapper').should('exist'),
  insightsComponentDoesntExist: () =>
    cy.getByTestSubj('endpointDetailsInsightsWrapper').should('not.exist'),
  addConnectorButtonExists: () => cy.getByTestSubj('addNewConnectorButton').should('exist'),
};
