/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepReadonly } from 'utility-types';
import { EndpointManagementPageMap, getEndpointManagementPageMap } from './page_reference';

const pageById: DeepReadonly<EndpointManagementPageMap> = getEndpointManagementPageMap();

export const visitPolicyList = (): Cypress.Chainable => {
  return cy.visit(pageById.policyList);
};
