/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clickAction, openBarchartPopoverMenu } from './common';
import {
  CLOSE_TIMELINE_BTN,
  FLYOUT_INVESTIGATE_IN_TIMELINE_ITEM,
  FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON,
  INDICATORS_TABLE_CELL_TIMELINE_BUTTON,
  INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON,
  UNTITLED_TIMELINE_BUTTON,
} from '../../screens/threat_intelligence/timeline';
import {
  BARCHART_TIMELINE_BUTTON,
  FLYOUT_BLOCK_MORE_ACTIONS_BUTTON,
  FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM,
  FLYOUT_TABLE_MORE_ACTIONS_BUTTON,
  INDICATOR_TYPE_CELL,
} from '../../screens/threat_intelligence/indicators';

/**
 * Add data to timeline from barchart legend menu item
 */
export const addToTimelineFromBarchartLegend = () => {
  openBarchartPopoverMenu();
  cy.get(BARCHART_TIMELINE_BUTTON).first().click();
};
/**
 * Add data to timeline from indicators table cell menu
 */
export const addToTimelineFromTableCell = () => {
  clickAction(INDICATOR_TYPE_CELL, 0, INDICATORS_TABLE_CELL_TIMELINE_BUTTON);
};

/**
 * Open untitled timeline from button in footer
 */
export const openTimeline = () => {
  cy.get(UNTITLED_TIMELINE_BUTTON).first().click();
};

/**
 * Close flyout button in top right corner
 */
export const closeTimeline = () => {
  cy.get(CLOSE_TIMELINE_BTN).should('be.visible').click();
};

/**
 * Add data to timeline from flyout overview tab table
 */
export const addToTimelineFromFlyoutOverviewTabTable = () => {
  cy.get(FLYOUT_TABLE_MORE_ACTIONS_BUTTON).first().click();
  cy.get(FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON).first().click();
};

/**
 * Add data to timeline from flyout overview tab block
 */
export const addToTimelineFromFlyoutOverviewTabBlock = () => {
  clickAction(FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCK_ITEM, 0, FLYOUT_BLOCK_MORE_ACTIONS_BUTTON);
};

/**
 * Investigate data to timeline from indicators table row
 */
export const investigateInTimelineFromTable = () => {
  cy.get(INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON).first().click();
};

/**
 * Investigate data to timeline from flyout take action button
 */
export const investigateInTimelineFromFlyout = () => {
  cy.get(FLYOUT_INVESTIGATE_IN_TIMELINE_ITEM).first().click();
};
