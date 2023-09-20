/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEFT_NAV_TOGGLE_BUTTON, LEFT_NAVIGATION, LEFT_NAVIGATION_TITLE } from '../screens/common';
import * as GETTING_STARTED_PAGE from '../screens/getting_started_page';
import { FAST_TIMEOUT } from '../support/timeouts';
import { deleteApiKeys } from '../tasks/api_keys';
import { login } from '../tasks/login';
import { navigatesToGettingStartedPage } from '../tasks/navigation';

describe('Getting Started', () => {
  beforeEach(() => {
    login();
    navigatesToGettingStartedPage();
  });

  it('should have left navigation', () => {
    cy.get(LEFT_NAV_TOGGLE_BUTTON).should('exist');

    cy.log('Left Navigation should be open by default');
    cy.get(LEFT_NAVIGATION).should('be.visible');
    cy.get(LEFT_NAVIGATION_TITLE).should('be.visible').and('have.text', 'Elasticsearch');

    cy.log('Left Navigation should be able to toggle');
    cy.get(LEFT_NAV_TOGGLE_BUTTON).click();
    cy.get(LEFT_NAVIGATION).should('not.be.visible');
    cy.get(LEFT_NAV_TOGGLE_BUTTON).click();
    cy.get(LEFT_NAVIGATION).should('be.visible');

    cy.log('Left Navigation should contain expected Items');
    [
      'Getting started',
      'Dev Tools',
      'Console',
      'Search Profiler',
      'Explore',
      'Discover',
      'Dashboard',
      'Visualize Library',
      'Alerts',
      'Content',
      'Index Management',
      'Pipelines',
      // 'Connectors',
      'Security',
      'API keys',
    ].map((item) => {
      cy.get(LEFT_NAVIGATION).contains(item);
    });

    cy.log('Left Navigation getting started should be selected');
    cy.get(GETTING_STARTED_PAGE.NAV_ITEM)
      .should('exist')
      .and('have.class', 'euiSideNavItemButton-isSelected')
      .and('have.attr', 'href', '/app/elasticsearch');
  });

  it('should have client selections', () => {
    cy.get(GETTING_STARTED_PAGE.CLIENT_SELECT_CONTAINER).should('exist').and('be.visible');
    [
      GETTING_STARTED_PAGE.CLIENT_SELECT_CURL,
      GETTING_STARTED_PAGE.CLIENT_SELECT_PYTHON,
      GETTING_STARTED_PAGE.CLIENT_SELECT_JS,
      GETTING_STARTED_PAGE.CLIENT_SELECT_GO,
    ].map((langPanel) => {
      cy.get(GETTING_STARTED_PAGE.CLIENT_SELECT_CONTAINER)
        .find(langPanel)
        .should('exist')
        .and('be.visible');
    });
    cy.log('Can change languages with select panels');
    cy.get(GETTING_STARTED_PAGE.CLIENT_SELECT_CURL).click();
    cy.get(GETTING_STARTED_PAGE.SECTION_INSTALL_CLIENT)
      .find(GETTING_STARTED_PAGE.CODE_BLOCK_CONTROL_PANEL)
      .contains('brew install curl');

    cy.get(GETTING_STARTED_PAGE.CLIENT_SELECT_JS).click();
    cy.get(GETTING_STARTED_PAGE.SECTION_INSTALL_CLIENT)
      .find(GETTING_STARTED_PAGE.CODE_BLOCK_CONTROL_PANEL)
      .contains('npm install');

    cy.get(GETTING_STARTED_PAGE.CLIENT_SELECT_PYTHON).click();
    cy.get(GETTING_STARTED_PAGE.SECTION_INSTALL_CLIENT)
      .find(GETTING_STARTED_PAGE.CODE_BLOCK_CONTROL_PANEL)
      .contains('pip install');
  });
});

describe('API Keys', () => {
  beforeEach(() => {
    deleteApiKeys();
    login();
    navigatesToGettingStartedPage();
  });
  it('should allow creating a default API key', () => {
    cy.get(GETTING_STARTED_PAGE.API_KEYS_COUNT_BADGE).should('exist').and('have.text', '0');
    cy.get(GETTING_STARTED_PAGE.NEW_API_KEY_BUTTON).should('exist').and('not.be.disabled');
    cy.get(GETTING_STARTED_PAGE.MANAGE_API_KEYS_BUTTON).should('exist').and('not.be.disabled');

    cy.get(GETTING_STARTED_PAGE.NEW_API_KEY_BUTTON).click();
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_FLYOUT).should('be.visible');
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_SUBMIT).should('be.disabled');
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_CANCEL).click();
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_FLYOUT).should('not.exist');

    cy.get(GETTING_STARTED_PAGE.NEW_API_KEY_BUTTON).click();
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_FLYOUT).should('be.visible');
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_NAME).type('test-defaults-api-key');
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_SUBMIT).should('not.be.disabled');
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_SUBMIT).click();

    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_SUCCESS)
      .should('exist')
      .find(GETTING_STARTED_PAGE.CREATE_API_KEY_SUCCESS_CODEBLOCK)
      .contains('"name": "test-defaults-api-key"');
    // We expect the success code block to always be there since we just found it
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_SUCCESS, { timeout: FAST_TIMEOUT })
      .find(GETTING_STARTED_PAGE.CREATE_API_KEY_SUCCESS_CODEBLOCK)
      .contains('"expiration":')
      .should('exist');
  });
  it('should allow creating an API key that doesnt expire', () => {
    cy.get(GETTING_STARTED_PAGE.NEW_API_KEY_BUTTON).should('exist');
    cy.get(GETTING_STARTED_PAGE.NEW_API_KEY_BUTTON).click();
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_FLYOUT).should('be.visible');
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_NAME).type('test-unlimited-key');

    // Check for days field input
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_EXPIRES_DAYS_INPUT).should('exist');
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_EXPIRES_NEVER_RADIO).find('label').click();
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_EXPIRES_DAYS_INPUT).should('not.exist');
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_SUBMIT).click();

    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_SUCCESS)
      .should('exist')
      .find(GETTING_STARTED_PAGE.CREATE_API_KEY_SUCCESS_CODEBLOCK)
      .contains('"name": "test-unlimited-key"');
    // We expect the success code block to always be there since we just found it,
    // so we use a fast timeout and we want to pass / fail fast since were looking for something to NOT be found
    // inside the code block.
    cy.get(GETTING_STARTED_PAGE.CREATE_API_KEY_SUCCESS, { timeout: FAST_TIMEOUT })
      .find(GETTING_STARTED_PAGE.CREATE_API_KEY_SUCCESS_CODEBLOCK)
      .contains('"expiration":')
      .should('not.exist');
  });
});
