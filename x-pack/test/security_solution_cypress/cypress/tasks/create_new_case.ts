/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IbmResilientConnectorOptions,
  JiraConnectorOptions,
  ServiceNowconnectorOptions,
  TestCase,
  TestCaseWithoutTimeline,
} from '../objects/case';
import { ALL_CASES_STATUS_FILTER, ALL_CASES_OPEN_FILTER } from '../screens/all_cases';
import { TIMELINE_SEARCHBOX } from '../screens/common/controls';

import {
  BACK_TO_CASES_BTN,
  DESCRIPTION_INPUT,
  SUBMIT_BTN,
  INSERT_TIMELINE_BTN,
  LOADING_SPINNER,
  TAGS_INPUT,
  TITLE_INPUT,
  TIMELINE,
  EMPTY_TIMELINE,
} from '../screens/create_new_case';
import {
  CONNECTOR_RESILIENT,
  CONNECTOR_SELECTOR,
  SELECT_IMPACT,
  SELECT_INCIDENT_TYPE,
  SELECT_ISSUE_TYPE,
  SELECT_JIRA,
  SELECT_PRIORITY,
  SELECT_RESILIENT,
  SELECT_SEVERITY,
  SELECT_SN,
  SELECT_URGENCY,
} from '../screens/edit_connector';
import { LOADING_INDICATOR } from '../screens/security_header';

export const backToCases = () => {
  cy.get(BACK_TO_CASES_BTN).click({ force: true });
};

export const filterStatusOpen = () => {
  cy.get(ALL_CASES_STATUS_FILTER).click();
  cy.get(ALL_CASES_OPEN_FILTER).click();
};

export const fillCasesMandatoryfields = (newCase: TestCaseWithoutTimeline) => {
  cy.get(TITLE_INPUT).type(newCase.name, { force: true });
  newCase.tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });
  cy.get(DESCRIPTION_INPUT).type(`${newCase.description} `, { force: true });
};

export const attachTimeline = (newCase: TestCase) => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for timeline to appear');
      cy.get('body').type('{esc}');
      cy.get(INSERT_TIMELINE_BTN).click();
      cy.get(LOADING_INDICATOR).should('not.exist');
      cy.get(TIMELINE_SEARCHBOX).should('exist');
      cy.get(TIMELINE_SEARCHBOX).should('be.visible');

      return cy.root().then(($el) => {
        const emptyTimelineState = $el.find(EMPTY_TIMELINE);
        if (emptyTimelineState.length > 0) {
          cy.log('Timeline dropdown is empty');
          return false;
        } else {
          return true;
        }
      });
    },
    { interval: 500, timeout: 12000 }
  );
  cy.get(TIMELINE).first().click();
};

export const createCase = () => {
  cy.get(SUBMIT_BTN).click({ force: true });
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
};

export const fillJiraConnectorOptions = (jiraConnector: JiraConnectorOptions) => {
  cy.get(CONNECTOR_SELECTOR).click({ force: true });
  cy.get(SELECT_JIRA).click({ force: true });
  cy.get(SELECT_ISSUE_TYPE).should('exist');
  cy.get(SELECT_ISSUE_TYPE).select(jiraConnector.issueType);

  cy.get(SELECT_PRIORITY).should('exist');
  cy.get(SELECT_PRIORITY).select(jiraConnector.priority);
};

export const fillServiceNowConnectorOptions = (
  serviceNowConnectorOpions: ServiceNowconnectorOptions
) => {
  cy.get(CONNECTOR_SELECTOR).click({ force: true });
  cy.get(SELECT_SN).click({ force: true });
  cy.get(SELECT_SEVERITY).should('exist');
  cy.get(SELECT_URGENCY).should('exist');
  cy.get(SELECT_IMPACT).should('exist');
  cy.get(SELECT_URGENCY).select(serviceNowConnectorOpions.urgency);
  cy.get(SELECT_SEVERITY).select(serviceNowConnectorOpions.severity);
  cy.get(SELECT_IMPACT).select(serviceNowConnectorOpions.impact);
};

export const fillIbmResilientConnectorOptions = (
  ibmResilientConnector: IbmResilientConnectorOptions
) => {
  cy.get(CONNECTOR_SELECTOR).click({ force: true });
  cy.get(SELECT_RESILIENT).click({ force: true });
  cy.get(SELECT_INCIDENT_TYPE).should('exist');
  cy.get(SELECT_SEVERITY).should('exist');
  ibmResilientConnector.incidentTypes.forEach((incidentType) => {
    cy.get(SELECT_INCIDENT_TYPE).type(`${incidentType}{enter}`, { force: true });
  });
  cy.get(CONNECTOR_RESILIENT).click({ force: true });
  cy.get(SELECT_SEVERITY).select(ibmResilientConnector.severity);
};
