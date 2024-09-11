/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BLOCK_LIST_ADD_BUTTON,
  BLOCK_LIST_DESCRIPTION,
  BLOCK_LIST_NAME,
  BLOCK_LIST_TOAST_LIST,
  FLYOUT_ADD_TO_BLOCK_LIST_ITEM,
  INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON,
} from '../../screens/threat_intelligence/blocklist';

/**
 * Open the blocklist form from the indicators table more actions menu
 */
export const openAddToBlockListFlyoutFromTable = () => {
  cy.get(INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON).first().click();
};

/**
 * Open the blocklist form from the indicators flyout take action menu
 */
export const openAddToBlocklistFromFlyout = () => {
  cy.get(FLYOUT_ADD_TO_BLOCK_LIST_ITEM).first().click();
};

/**
 * Fill out blocklist form with title and description
 */
export const fillBlocklistForm = (title: string, description: string) => {
  cy.get(BLOCK_LIST_NAME).type(title);
  cy.get(BLOCK_LIST_DESCRIPTION).type(description);
  cy.get(BLOCK_LIST_ADD_BUTTON).last().click();

  const text: string = `"${title}" has been added`;
  cy.get(BLOCK_LIST_TOAST_LIST).should('exist').and('contain.text', text);
};
