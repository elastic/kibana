/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_BODY } from '../../screens/expandable_flyout/alert_details_right_panel';
import {
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_FILTER,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ADD_TO_TIMELINE,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_IN,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_TOGGLE_COLUMN,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_CELL,
} from '../../screens/expandable_flyout/alert_details_right_panel_table_tab';

/**
 * Filter table under the Table tab in the alert details expandable flyout right section
 */
export const filterTableTabTable = (filterValue: string) =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_FILTER).type(filterValue);
  });

/**
 * Filter In action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const filterInTableTabTable = () => {
  cy.get('body').realHover();
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_CELL).first().realHover();
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_IN).first().click();
};
/**
 * Filter Out action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const filterOutTableTabTable = () => {
  cy.get('body').realHover();
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_CELL).first().realHover();
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT).first().click();
};
/**
 * Add to timeline action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const addToTimelineTableTabTable = () => {
  cy.get('body').realHover();
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_CELL).first().realHover();
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ADD_TO_TIMELINE).click();
};

/**
 * Show Toggle column button in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const toggleColumnTableTabTable = () => {
  cy.get('body').realHover();
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_CELL).first().realHover();
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_TOGGLE_COLUMN).click();
};
