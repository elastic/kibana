/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DeletedIndexedCase,
  IndexedCase,
} from '../../../../common/endpoint/data_loaders/index_case';

export const indexNewCase = (): Cypress.Chainable<
  Pick<IndexedCase, 'data'> & { cleanup: () => Cypress.Chainable<DeletedIndexedCase> }
> => {
  return cy.task('indexCase').then((caseData) => {
    return {
      data: caseData,
      cleanup: (): Cypress.Chainable<DeletedIndexedCase> => {
        cy.log(`Deleting Case data: ${caseData.title} (${caseData.id})`);
        return cy.task('deleteIndexedCase', caseData);
      },
    };
  });
};
