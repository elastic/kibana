/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_BODY } from '../../screens/expandable_flyout/alert_details_right_panel';
import {
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CLEAR_FILTER,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_FILTER,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ADD_TO_TIMELINE,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_IN,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT,
  DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_MORE_ACTIONS,
} from '../../screens/expandable_flyout/alert_details_right_panel_table_tab';

/**
 * Filter table under the Table tab in the alert details expandable flyout right section
 */
export const filterTableTabTable = (filterValue: string) =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_FILTER).type(filterValue);
  });

/**
 * Clear table filter under the Table tab in the alert details expandable flyout right section
 */
export const clearFilterTableTabTable = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CLEAR_FILTER).click();
  });

/**
 * Filter In action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const filterInTableTabTable = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_IN).first().click();
  });

/**
 * Filter Out action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const filterOutTableTabTable = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT).first().click();
  });

/**
 * Add to timeline action in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const addToTimelineTableTabTable = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_MORE_ACTIONS).first().click();
  });
  cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ADD_TO_TIMELINE).click();
};

/**
 * Show Copy to clipboard button in the first table row under the Table tab in the alert details expandable flyout right section
 */
export const copyToClipboardTableTabTable = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_MORE_ACTIONS).first().click();
  });
};

/**
 * Clear filters in the alert page KQL bar
 */
export const clearFilters = () =>
  cy.get(DOCUMENT_DETAILS_FLYOUT_BODY).within(() => {
    cy.get(DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT).first().click();
  });
