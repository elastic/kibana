/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENTS_VIEWER_FIELDS_BUTTON,
  FIELDS_BROWSER_CONTAINER,
  HOST_GEO_CITY_NAME_CHECKBOX,
  HOST_GEO_COUNTRY_NAME_CHECKBOX,
  INSPECT_QUERY,
  SERVER_SIDE_EVENT_COUNT,
  EVENTS_LOADING_TRUE,
  EVENTS_LOADING_FALSE,
} from '../../screens/hosts/events';

export const addsHostGeoCityNameToHeader = () => {
  cy.get(HOST_GEO_CITY_NAME_CHECKBOX).check();
};

export const addsHostGeoCountryNameToHeader = () => {
  cy.get(HOST_GEO_COUNTRY_NAME_CHECKBOX).check();
};

export const openEventsViewerFieldsBrowser = () => {
  cy.get(EVENTS_VIEWER_FIELDS_BUTTON).click();
  cy.get(SERVER_SIDE_EVENT_COUNT).should('not.have.text', '0');
  cy.get(FIELDS_BROWSER_CONTAINER).should('exist');
};

export const opensInspectQueryModal = () => {
  cy.get(INSPECT_QUERY).should('exist').trigger('mousemove');
  cy.get(INSPECT_QUERY).should('exist').click();
};

export const waitsForEventsToBeLoaded = () => {
  cy.get(SERVER_SIDE_EVENT_COUNT).should('not.have.text', '0');
};

export const waitForEventsDataGridToBeLoaded = () => {
  cy.get(EVENTS_LOADING_TRUE).should('not.exist');
  cy.get(EVENTS_LOADING_FALSE).should('exist');
};
