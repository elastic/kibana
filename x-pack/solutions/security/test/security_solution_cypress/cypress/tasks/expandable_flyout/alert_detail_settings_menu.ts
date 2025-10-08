/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_PUSH_OPTION,
  DOCUMENT_DETAILS_FLYOUT_SETTINGS_MENU_BUTTON,
} from '../../screens/expandable_flyout/alert_detail_settings_menu';

/**
 * Open the render menu in the flyout's header
 */
export const openRenderMenu = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_SETTINGS_MENU_BUTTON).click();
};

/**
 * Switch to push mode in the render menu
 */
export const clickOnPushModeOption = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_PUSH_OPTION).click();
};
