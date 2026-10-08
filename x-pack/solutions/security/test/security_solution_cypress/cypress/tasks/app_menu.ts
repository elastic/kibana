/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_MENU_OVERFLOW_BTN } from '../screens/app_menu';

/**
 * Opens the page app header "More" menu, where overflow actions such as "Import rules" live.
 */
export const openAppMenuOverflow = () => {
  cy.get(APP_MENU_OVERFLOW_BTN).click();
};

/**
 * Closes the page app header "More" menu by toggling its button.
 */
export const closeAppMenuOverflow = () => {
  cy.get(APP_MENU_OVERFLOW_BTN).click();
};
