/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndexedEndpointRuleAlerts,
  DeletedIndexedEndpointRuleAlerts,
} from '../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';

export const indexEndpointRuleAlerts = (options: {
  endpointAgentId: string;
  endpointHostname?: string;
  endpointIsolated?: boolean;
  count?: number;
}): Cypress.Chainable<
  Pick<IndexedEndpointRuleAlerts, 'alerts'> & {
    cleanup: () => Cypress.Chainable<DeletedIndexedEndpointRuleAlerts>;
  }
> => {
  return cy.task('indexEndpointRuleAlerts', options).then((alerts) => {
    return {
      alerts,
      cleanup: () => {
        cy.log(
          `Deleting Endpoint Rule Alerts data for endpoint id: ${options.endpointAgentId}`,
          alerts.map((alert) => alert._id)
        );

        return cy.task('deleteIndexedEndpointRuleAlerts', alerts);
      },
    };
  });
};
