/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare namespace Cypress {
  interface Chainable {
    loginAsElasticUser(path?: string): Cypress.Chainable<Cypress.Response<any>>;
    getByTestSubj(selector: string): Chainable<JQuery<Element>>;
    visitKibana(url: string, rangeFrom?: string, rangeTo?: string): void;
  }
}
