/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_NEW_CONNECTOR_DROPDOWN_BUTTON,
  CONNECTOR,
  CONNECTOR_NAME,
  CONNECTORS_DROPDOWN,
  JIRA_API_TOKEN,
  JIRA_CONNECTOR_CARD,
  JIRA_EMAIL,
  JIRA_PROJECT_KEY,
  JIRA_URL,
  PASSWORD,
  SAVE_BTN,
  SERVICE_NOW_CONNECTOR_CARD,
  URL,
  USERNAME,
} from '../screens/configure_cases';
import { MAIN_PAGE } from '../screens/security_main';

import type { Connector, JiraConnector } from '../objects/case';

export const addServiceNowConnector = (connector: Connector) => {
  cy.get(SERVICE_NOW_CONNECTOR_CARD).click();
  cy.get(CONNECTOR_NAME).type(connector.connectorName);
  cy.get(URL).type(connector.URL);
  cy.get(USERNAME).type(connector.username);
  cy.get(PASSWORD).type(connector.password);
  cy.get(SAVE_BTN).click({ force: true });
};

export const addJiraConnector = (connector: JiraConnector) => {
  cy.get(JIRA_CONNECTOR_CARD).click();
  cy.get(CONNECTOR_NAME).type(connector.connectorName);
  cy.get(JIRA_URL).type(connector.URL);
  cy.get(JIRA_PROJECT_KEY).type(connector.projectKey);
  cy.get(JIRA_EMAIL).type(connector.email);
  cy.get(JIRA_API_TOKEN).type(connector.token);
  cy.get(SAVE_BTN).click();
};

export const openAddNewConnectorOption = () => {
  cy.get(MAIN_PAGE).then(($page) => {
    if ($page.find(SERVICE_NOW_CONNECTOR_CARD).length !== 1) {
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
      cy.get(CONNECTORS_DROPDOWN).click();
      cy.get(ADD_NEW_CONNECTOR_DROPDOWN_BUTTON).click();
    }
  });
};

export const selectLastConnectorCreated = (id: string) => {
  cy.get(CONNECTORS_DROPDOWN).click({ force: true });
  cy.get(CONNECTOR(id)).click();
};
