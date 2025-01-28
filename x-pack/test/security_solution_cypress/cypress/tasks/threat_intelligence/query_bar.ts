/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clickAction, openBarchartPopoverMenu } from './common';
import {
  QUERY_BAR,
  QUERY_BAR_MENU_REMOVE_ALL_FILTERS_BUTTON,
  QUERY_BAR_MENU,
} from '../../screens/threat_intelligence/query_bar';
import {
  BARCHART_FILTER_IN_BUTTON,
  BARCHART_FILTER_OUT_BUTTON,
  INDICATORS_TABLE_CELL_FILTER_IN_BUTTON,
  INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON,
  INDICATOR_TYPE_CELL,
  FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON,
  FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON,
  FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON,
  FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON,
  FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM,
} from '../../screens/threat_intelligence/indicators';

/**
 * Filter in value by clicking on the menu item within barchart popover
 */
export const filterInFromBarChartLegend = () => {
  openBarchartPopoverMenu();
  cy.get(BARCHART_FILTER_IN_BUTTON).click();
};

/**
 * Filter out value by clicking on the menu item within barchart popover
 */
export const filterOutFromBarChartLegend = () => {
  openBarchartPopoverMenu();
  cy.get(BARCHART_FILTER_OUT_BUTTON).click();
};

/**
 * Filter in value by clicking on the menu item within an indicators table cell
 */
export const filterInFromTableCell = () => {
  clickAction(INDICATOR_TYPE_CELL, 0, INDICATORS_TABLE_CELL_FILTER_IN_BUTTON);
};

/**
 * Filter out value by clicking on the menu item within an indicators table cell
 */
export const filterOutFromTableCell = () => {
  clickAction(INDICATOR_TYPE_CELL, 0, INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON);
};

/**
 * Clears all filters within KQL bar
 */
export const clearKQLBar = () => {
  cy.get(QUERY_BAR).within(() => cy.get(QUERY_BAR_MENU).click());
  cy.get(QUERY_BAR_MENU_REMOVE_ALL_FILTERS_BUTTON).click();
};

/**
 * Filter in value from indicators flyout block item
 */
export const filterInFromFlyoutBlockItem = () => {
  clickAction(
    FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM,
    0,
    FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON
  );
};

/**
 * Filter out value from indicators flyout block item
 */
export const filterOutFromFlyoutBlockItem = () => {
  clickAction(
    FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM,
    0,
    FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON
  );
};

/**
 * Filter in value from indicators flyout overview tab table
 */
export const filterInFromFlyoutOverviewTable = () => {
  cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON).first().click();
};

/**
 * Filter out value from indicators flyout overview tab table
 */
export const filterOutFromFlyoutOverviewTable = () => {
  cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON).first().click();
};

/**
 * Filter in value from indicators flyout overview tab table
 */
export const filterInFromFlyoutTableTab = () => {
  cy.get(FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON).first().click();
};

/**
 * Filter out value from indicators flyout overview tab table
 */
export const filterOutFromFlyoutTableTab = () => {
  cy.get(FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON).first().click();
};
