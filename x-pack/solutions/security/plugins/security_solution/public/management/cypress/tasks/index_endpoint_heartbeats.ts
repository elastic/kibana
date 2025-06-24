/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DeletedEndpointHeartbeats,
  IndexedEndpointHeartbeats,
} from '../../../../common/endpoint/data_loaders/index_endpoint_hearbeats';

export const indexEndpointHeartbeats = (options: {
  count?: number;
  unbilledCount?: number;
}): Cypress.Chainable<
  Pick<IndexedEndpointHeartbeats, 'data'> & {
    cleanup: () => Cypress.Chainable<DeletedEndpointHeartbeats>;
  }
> => {
  return cy.task('indexEndpointHeartbeats', options).then((res) => {
    return {
      data: res,
      cleanup: () => {
        cy.log('Deleting Endpoint Host heartbeats');

        return cy.task('deleteIndexedEndpointHeartbeats', res);
      },
    };
  });
};
