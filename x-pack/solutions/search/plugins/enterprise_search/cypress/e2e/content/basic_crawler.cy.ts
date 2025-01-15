/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';

import { NEW_INDEX_CARD, CRAWLER_INDEX, INDEX_OVERVIEW, ROUTES, getIndexRoute } from './selectors';

describe('Enterprise Search Crawler', () => {
  it('test', () => {
    const envConfig = Cypress.env('crawler_test');
    const indexName = 'cypress-crawler-' + Math.random();

    login();
    cy.visit(ROUTES.NEW_INDEX);

    // Crawler selected by default
    cy.getBySel(NEW_INDEX_CARD.SELECT_CRAWLER).click();

    // we are in correct route
    cy.url().should('contain', ROUTES.NEW_INDEX);

    cy.getBySel(CRAWLER_INDEX.CREATE_BUTTON).should('be.disabled');

    // type new name
    cy.getBySel(CRAWLER_INDEX.INDEX_NAME_INPUT).type(indexName);

    // create index
    cy.getBySel(CRAWLER_INDEX.CREATE_BUTTON).click();

    // make sure we are in new index
    cy.url().should('contain', getIndexRoute(indexName) + 'domain_management');

    cy.getBySel(CRAWLER_INDEX.DOMAIN_MANAGEMENT.DOMAIN_INPUT).type(envConfig.domain);
    cy.getBySel(CRAWLER_INDEX.DOMAIN_MANAGEMENT.DOMAIN_BUTTON).click();

    cy.getBySel(CRAWLER_INDEX.DOMAIN_MANAGEMENT.SUBMIT_BUTTON).should('be.enabled');
    cy.getBySel(CRAWLER_INDEX.DOMAIN_MANAGEMENT.SUBMIT_BUTTON).click();

    cy.getBySel(CRAWLER_INDEX.CRAWL_DROPDOWN).should('be.enabled');
    cy.getBySel(CRAWLER_INDEX.CRAWL_DROPDOWN).click();
    cy.getBySel(CRAWLER_INDEX.CRAWL_ALL_DOMAINS).click();

    // go to overview tab
    cy.getBySel(INDEX_OVERVIEW.TABS.OVERVIEW).click();

    // Page header has index name
    cy.get('main header h1').should('contain.text', indexName);
    // check Ingestion Type stat is Crawler
    cy.getBySel(INDEX_OVERVIEW.STATS.INGESTION_TYPE).should('contain.text', 'Crawler');

    cy.getBySel(INDEX_OVERVIEW.STATS.DOCUMENT_COUNT).should((el) => {
      const text = el.text();
      const count = parseInt(text.match(/[0-9]+/g), 10);
      expect(count).to.gt(0);
    });
  });
});
