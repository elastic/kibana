/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import {
  CONNECTOR_INDEX,
  getIndexRoute,
  INDEX_OVERVIEW,
  NEW_INDEX_CARD,
  NEW_CONNECTOR_PAGE,
  ROUTES,
  SELECT_CONNECTOR,
  SEARCH_INDICES,
} from '../selectors';

describe('Enterprise Search MongoDB connector', () => {
  it('succesfully syncs documents with single sync', () => {
    // Get configuration information from cypress.env.json
    const mongoConfig = Cypress.env('mongo_test');
    const indexName = 'cypress-mongodb-' + Math.random();
    const baseUrl = Cypress.config().baseUrl;
    login();

    cy.visit(ROUTES.SEARCH_INDICES_OVERVIEW);
    cy.getBySel(SEARCH_INDICES.CREATE_INDEX_BUTTON).click();

    cy.url().should('eq', baseUrl + ROUTES.NEW_INDEX);

    // select connector
    cy.getBySel(NEW_INDEX_CARD.SELECT_CONNECTOR).click();

    // we are in correct route
    cy.url().should('contain', ROUTES.SELECT_CONNECTOR);

    // Select MongoDB from the list
    cy.get('#checkableCard-mongodb').should('not.be.selected');
    cy.get('#checkableCard-mongodb-details')
      .find('a')
      .invoke('attr', 'href')
      .should('include', 'connectors-mongodb.html');

    cy.get('#checkableCard-mongodb').click();

    cy.getBySel(SELECT_CONNECTOR.SELECT_AND_CONFIGURE_BUTTON).click();

    // Connector URL, mongo selected
    cy.url().should('contain', 'service_type=mongodb');

    cy.getBySel(NEW_CONNECTOR_PAGE.INDEX_NAME_INPUT).type(indexName);

    // create index
    cy.getBySel(NEW_CONNECTOR_PAGE.CREATE_BUTTON).click();

    // make sure we are in new index route
    cy.url().should('contain', getIndexRoute(indexName) + 'configuration');

    // Fill in connector configuration
    cy.getBySel(CONNECTOR_INDEX.getConfigurationRow('host')).type(mongoConfig.host);
    cy.getBySel(CONNECTOR_INDEX.getConfigurationRow('user')).type(mongoConfig.username);
    cy.getBySel(CONNECTOR_INDEX.getConfigurationRow('password')).type(mongoConfig.password);
    cy.getBySel(CONNECTOR_INDEX.getConfigurationRow('database')).type(mongoConfig.database);
    cy.getBySel(CONNECTOR_INDEX.getConfigurationRow('collection')).type(mongoConfig.collection);
    cy.getBySel(CONNECTOR_INDEX.SAVE_CONFIG).click();

    // Wait until configuration is saved
    cy.getBySel(CONNECTOR_INDEX.EDIT_CONFIG);
    cy.getBySel(CONNECTOR_INDEX.SET_SCHEDULE_BUTTON).click();

    // Scheduling Tab opened
    cy.url().should('contain', getIndexRoute(indexName) + 'scheduling');

    // Start one time sync
    cy.getBySel(CONNECTOR_INDEX.HEADER_SYNC_MENU).click();
    cy.getBySel(CONNECTOR_INDEX.HEADER_SYNC_MENU_START).click();

    // go to overview tab
    cy.getBySel(INDEX_OVERVIEW.TABS.OVERVIEW).click();

    cy.getBySel(INDEX_OVERVIEW.STATS.INGESTION_TYPE).should('contain.text', 'Connector');
    cy.getBySel(INDEX_OVERVIEW.STATS.CONNECTOR_TYPE).should('contain.text', 'MongoDB');
    cy.getBySel(INDEX_OVERVIEW.STATS.INGESTION_STATUS).should('contain.text', 'Configured');
    cy.getBySel(INDEX_OVERVIEW.STATS.INGESTION_STATUS).should('contain.text', 'Connected');

    // Wait until document count > 0
    cy.getBySel(INDEX_OVERVIEW.STATS.DOCUMENT_COUNT).should((el) => {
      const text = el.text();
      const count = parseInt(text.match(/[0-9]+/g), 10);
      expect(count).to.gt(0);
    });
  });
});
