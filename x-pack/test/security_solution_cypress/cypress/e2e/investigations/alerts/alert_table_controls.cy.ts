/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  switchAlertTableToEventRenderedView,
  switchAlertTableToGridView,
  waitForAlerts,
} from '../../../tasks/alerts';
import { FIELDS_BROWSER_BTN } from '../../../screens/rule_details';
import {
  addsFields,
  clearFieldsBrowser,
  closeFieldsBrowser,
  filterFieldsBrowser,
  removeField,
} from '../../../tasks/fields_browser';
import { FIELDS_BROWSER_CONTAINER } from '../../../screens/fields_browser';
import { getNewRule } from '../../../objects/rule';
import {
  DATA_GRID_COLUMN_ORDER_BTN,
  DATA_GRID_FIELDS,
  DATA_GRID_FULL_SCREEN,
  GET_DATA_GRID_HEADER,
  GET_DATA_GRID_HEADER_CELL_ACTION_GROUP,
} from '../../../screens/common/data_grid';
import { createRule } from '../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ALERTS_URL } from '../../../urls/navigation';
import { DATAGRID_HEADER } from '../../../screens/timeline';

/*
 *
 * Alert table is third party component which cannot be easily tested by jest.
 * This test main checks if Alert Table controls are rendered properly.
 *
 * */

describe.skip(`Alert Table Controls`, { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('should enter and exit full screen, column sorting', () => {
    cy.get(DATA_GRID_FULL_SCREEN)
      .should('have.attr', 'aria-label', 'Enter fullscreen')
      .trigger('click');
    cy.get(DATA_GRID_FULL_SCREEN)
      .should('have.attr', 'aria-label', 'Exit fullscreen')
      .trigger('click');
  });

  it('should have correct column sorting values', () => {
    cy.get(DATA_GRID_COLUMN_ORDER_BTN).should('be.visible');

    cy.log('Date Column');

    const timestampField = DATA_GRID_FIELDS.TIMESTAMP.fieldName;
    cy.get(GET_DATA_GRID_HEADER(timestampField)).trigger('click');
    cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(timestampField))
      .should('be.visible')
      .should('contain.text', 'Sort Old-New');

    cy.log('Number column');

    const riskScoreField = DATA_GRID_FIELDS.RISK_SCORE.fieldName;
    cy.get(GET_DATA_GRID_HEADER(riskScoreField)).trigger('click');
    cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(riskScoreField))
      .should('be.visible')
      .should('contain.text', 'Sort Low-High');

    cy.log('Text Column');

    const ruleField = DATA_GRID_FIELDS.RULE.fieldName;
    cy.get(GET_DATA_GRID_HEADER(ruleField)).trigger('click');
    cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(ruleField))
      .should('be.visible')
      .should('contain.text', 'Sort A-Z');
  });

  it('should retain column configuration when a column is added or removed after reloading the page', () => {
    const severityFieldName = 'kibana.alert.severity';
    const idFieldName = '_id';

    cy.get(DATAGRID_HEADER(severityFieldName)).should('exist');
    cy.get(DATAGRID_HEADER(idFieldName)).should('not.exist');

    cy.get(FIELDS_BROWSER_BTN).click();
    cy.get(FIELDS_BROWSER_CONTAINER).should('exist');

    cy.log('remove severity field');

    filterFieldsBrowser(severityFieldName);
    removeField(severityFieldName);

    cy.log('add id field');

    clearFieldsBrowser();
    filterFieldsBrowser(idFieldName);
    addsFields([idFieldName]);
    closeFieldsBrowser();

    cy.get(DATAGRID_HEADER(severityFieldName)).should('not.exist');
    cy.get(DATAGRID_HEADER(idFieldName)).should('exist');

    cy.reload();
    waitForAlerts();

    cy.get(DATAGRID_HEADER(severityFieldName)).should('not.exist');
    cy.get(DATAGRID_HEADER(idFieldName)).should('exist');
  });

  it('should retain columns configuration when switching between eventrenderedView and gridView', () => {
    const fieldName = '_id';
    cy.get(FIELDS_BROWSER_BTN).click();
    cy.get(FIELDS_BROWSER_CONTAINER).should('be.visible');

    addsFields([fieldName]);
    closeFieldsBrowser();

    cy.get(DATAGRID_HEADER(fieldName)).should('be.visible');

    switchAlertTableToEventRenderedView();

    cy.get(DATAGRID_HEADER(fieldName)).should('not.exist');

    switchAlertTableToGridView();

    cy.get(DATAGRID_HEADER(fieldName)).should('be.visible');
  });
});
