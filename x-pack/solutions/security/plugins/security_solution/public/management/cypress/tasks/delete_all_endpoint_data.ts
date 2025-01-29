/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeleteAllEndpointDataResponse } from '../../../../scripts/endpoint/common/delete_all_endpoint_data';

export const deleteAllLoadedEndpointData = (options: {
  endpointAgentIds: string[];
}): Cypress.Chainable<DeleteAllEndpointDataResponse> => {
  return cy.task('deleteAllEndpointData', options);
};
