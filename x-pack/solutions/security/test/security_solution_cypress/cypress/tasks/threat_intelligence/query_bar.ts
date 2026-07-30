/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
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
  FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON,
  FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS,
  FLYOUT_OVERVIEW_HIGHLIGHTED_FIELDS_TABLE,
  FLYOUT_TABLE,
  CELL_ACTIONS_RENDER_CONTENT,
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
  clickAction(INDICATOR_TYPE_CELL, 15, INDICATORS_TABLE_CELL_FILTER_IN_BUTTON);
};

/**
 * Filter out value by clicking on the menu item within an indicators table cell
 */
export const filterOutFromTableCell = () => {
  clickAction(INDICATOR_TYPE_CELL, 15, INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON);
};

/**
 * Clears all filters within KQL bar
 */
export const clearKQLBar = () => {
  cy.get(QUERY_BAR).within(() => cy.get(QUERY_BAR_MENU).click());
  cy.get(QUERY_BAR_MENU_REMOVE_ALL_FILTERS_BUTTON).click();
};

/**
 * Hover a Security cell-actions wrapper so the hover-intent popover mounts, then click
 * the given action. Prefer the cellActions root over inner value nodes — mouseenter on
 * HoverActionsPopover does not bubble from children reliably under Cypress realHover.
 */
const clickFlyoutCellAction = (cellActionsSelector: string, actionSelector: string) => {
  recurse(
    () => {
      cy.get(cellActionsSelector).filter(':visible').first().should('be.visible').realHover();
      // Short timeout so recurse can re-hover if the hover-intent popover did not mount
      return cy.get(actionSelector, { timeout: 2000 }).filter(':visible').first();
    },
    ($el) => $el.is(':visible')
  );

  cy.get(actionSelector).filter(':visible').first().click();
};

/**
 * Filter in value from indicators flyout header high-level block
 */
export const filterInFromFlyoutBlockItem = () => {
  clickFlyoutCellAction(
    `${FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS} ${CELL_ACTIONS_RENDER_CONTENT}`,
    FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON
  );
};

/**
 * Filter out value from indicators flyout header high-level block
 */
export const filterOutFromFlyoutBlockItem = () => {
  clickFlyoutCellAction(
    `${FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS} ${CELL_ACTIONS_RENDER_CONTENT}`,
    FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON
  );
};

/**
 * Filter in value from indicators flyout overview tab table
 */
export const filterInFromFlyoutOverviewTable = () => {
  clickFlyoutCellAction(
    `${FLYOUT_OVERVIEW_HIGHLIGHTED_FIELDS_TABLE} ${CELL_ACTIONS_RENDER_CONTENT}`,
    FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON
  );
};

/**
 * Filter out value from indicators flyout overview tab table
 */
export const filterOutFromFlyoutOverviewTable = () => {
  clickFlyoutCellAction(
    `${FLYOUT_OVERVIEW_HIGHLIGHTED_FIELDS_TABLE} ${CELL_ACTIONS_RENDER_CONTENT}`,
    FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON
  );
};

/**
 * Filter in value from indicators flyout table tab action column
 */
export const filterInFromFlyoutTableTab = () => {
  clickFlyoutCellAction(
    `${FLYOUT_TABLE} ${CELL_ACTIONS_RENDER_CONTENT}`,
    FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON
  );
};

/**
 * Filter out value from indicators flyout table tab action column
 */
export const filterOutFromFlyoutTableTab = () => {
  clickFlyoutCellAction(
    `${FLYOUT_TABLE} ${CELL_ACTIONS_RENDER_CONTENT}`,
    FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON
  );
};
