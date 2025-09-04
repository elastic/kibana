/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function downgradeLicenseToBasic(): Cypress.Chainable<Cypress.Response<unknown>> {
  return cy
    .request({
      method: 'POST',
      url: '/api/license/start_basic?acknowledge=true',
      headers: {
        'kbn-xsrf': 'cypress-creds',
        'x-elastic-internal-origin': 'security-solution',
      },
    })
    .then(({ body }) => {
      cy.log(`downgradeLicenseToBasic:response body: ${JSON.stringify(body)}`);

      expect(body).contains({
        acknowledged: true,
      });
    });
}
