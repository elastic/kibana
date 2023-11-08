/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELDS_BROWSER_BTN } from '../../../screens/rule_details';
import { getNewRule } from '../../../objects/rule';
import {
  EVENT_SUMMARY_ALERT_RENDERER_CONTENT,
  EVENT_SUMMARY_COLUMN,
  ALERT_RENDERER_HOST_NAME,
  SHOW_TOP_N_HEADER,
} from '../../../screens/alerts';
import {
  DATA_GRID_COLUMN_ORDER_BTN,
  DATA_GRID_FIELD_SORT_BTN,
} from '../../../screens/common/data_grid';
import { HOVER_ACTIONS } from '../../../screens/timeline';
import {
  showHoverActionsEventRenderedView,
  switchAlertTableToEventRenderedView,
  waitForAlerts,
} from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';
import {
  TOP_N_ALERT_HISTOGRAM,
  TOP_N_CONTAINER_CLOSE_BTN,
  XY_CHART,
} from '../../../screens/shared';

describe(`Event Rendered View`, { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlerts();
    switchAlertTableToEventRenderedView();
    waitForAlerts();
  });

  it('Event Summary Column', () => {
    cy.get(EVENT_SUMMARY_COLUMN).should('be.visible');
    cy.get(EVENT_SUMMARY_ALERT_RENDERER_CONTENT).should('be.visible');
  });

  it('Hover Action TopN in event summary column', () => {
    showHoverActionsEventRenderedView(ALERT_RENDERER_HOST_NAME);
    cy.get(HOVER_ACTIONS.SHOW_TOP).trigger('click');
    cy.get(TOP_N_ALERT_HISTOGRAM).should('be.visible');
    cy.get(SHOW_TOP_N_HEADER).first().should('have.text', 'Top host.name');
    cy.get(XY_CHART).should('be.visible');
    cy.get(TOP_N_CONTAINER_CLOSE_BTN).trigger('click');
    cy.get(XY_CHART).should('not.exist');
  });

  /*
   *
   * Alert table is third party component which cannot be easily tested by jest.
   * This test main checks if Alert Table controls are rendered properly.
   *
   * */
  it('Field Browser is not visible', () => {
    cy.get(FIELDS_BROWSER_BTN).should('not.exist');
  });

  it('Sorting control is not visible', () => {
    cy.get(DATA_GRID_FIELD_SORT_BTN).should('not.be.visible');
  });

  it('Column Order button is not visible', () => {
    cy.get(DATA_GRID_COLUMN_ORDER_BTN).should('not.exist');
  });
});
