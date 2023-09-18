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
import { navigateFromHeaderTo } from '../../../tasks/security_header';
import { FIELDS_BROWSER_BTN } from '../../../screens/rule_details';
import {
  addsFields,
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
import { cleanKibana } from '../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';
import { ALERTS_URL } from '../../../urls/navigation';
import { DATAGRID_HEADER } from '../../../screens/timeline';
import { TIMELINES, ALERTS } from '../../../screens/security_header';

/*
 *
 * Alert table is third party component which cannot be easily tested by jest.
 * This test main checks if Alert Table controls are rendered properly.
 *
 * */

describe(`Alert Table Controls`, () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('full screen, column sorting', () => {
    cy.get(DATA_GRID_FULL_SCREEN)
      .should('have.attr', 'aria-label', 'Enter fullscreen')
      .trigger('click');
    cy.get(DATA_GRID_FULL_SCREEN)
      .should('have.attr', 'aria-label', 'Exit fullscreen')
      .trigger('click');
    cy.get(DATA_GRID_COLUMN_ORDER_BTN).should('be.visible');
  });

  context('Sorting', () => {
    it('Date Column', () => {
      const timestampField = DATA_GRID_FIELDS.TIMESTAMP.fieldName;
      cy.get(GET_DATA_GRID_HEADER(timestampField)).trigger('click');
      cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(timestampField))
        .should('be.visible')
        .should('contain.text', 'Sort Old-New');
    });

    it('Number column', () => {
      const riskScoreField = DATA_GRID_FIELDS.RISK_SCORE.fieldName;
      cy.get(GET_DATA_GRID_HEADER(riskScoreField)).trigger('click');
      cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(riskScoreField))
        .should('be.visible')
        .should('contain.text', 'Sort Low-High');
    });

    it('Text Column', () => {
      const ruleField = DATA_GRID_FIELDS.RULE.fieldName;
      cy.get(GET_DATA_GRID_HEADER(ruleField)).trigger('click');
      cy.get(GET_DATA_GRID_HEADER_CELL_ACTION_GROUP(ruleField))
        .should('be.visible')
        .should('contain.text', 'Sort A-Z');
    });
  });

  context('Columns Configuration', () => {
    it('should retain column configuration when a column is removed when coming back to alert page', () => {
      const fieldName = 'kibana.alert.severity';
      cy.get(FIELDS_BROWSER_BTN).click();
      cy.get(FIELDS_BROWSER_CONTAINER).should('be.visible');

      filterFieldsBrowser(fieldName);
      removeField(fieldName);
      closeFieldsBrowser();
      cy.get(DATAGRID_HEADER(fieldName)).should('not.exist');

      navigateFromHeaderTo(TIMELINES);
      navigateFromHeaderTo(ALERTS);
      waitForAlerts();
      cy.get(DATAGRID_HEADER('_id')).should('not.exist');
    });
    it('should retain column configuration when a column is added when coming back to alert page', () => {
      cy.get(FIELDS_BROWSER_BTN).click();
      cy.get(FIELDS_BROWSER_CONTAINER).should('be.visible');

      addsFields(['_id']);
      closeFieldsBrowser();
      cy.get(DATAGRID_HEADER('_id')).should('be.visible');

      navigateFromHeaderTo(TIMELINES);
      navigateFromHeaderTo(ALERTS);
      waitForAlerts();
      cy.get(DATAGRID_HEADER('_id')).should('be.visible');
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
});
