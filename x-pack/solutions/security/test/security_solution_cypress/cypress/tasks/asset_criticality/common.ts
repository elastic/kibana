/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USER_COLUMN } from '../../screens/alerts';
import {
  ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON,
  ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SAVE_BTN,
  ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT,
  ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT_OPTION,
  OPEN_HOST_FLYOUT_BUTTON,
  OPEN_USER_FLYOUT_BUTTON,
} from '../../screens/asset_criticality/flyouts';
import { scrollAlertTableColumnIntoView, waitForAlerts } from '../alerts';

/**
 * Find the first alert row in the alerts table then click on the host name to open the flyout
 */
export const expandFirstAlertHostFlyout = () => {
  waitForAlerts();
  // Cypress is flaky on clicking this button despite production not having that issue
  // eslint-disable-next-line cypress/no-force
  cy.get(OPEN_HOST_FLYOUT_BUTTON).first().click({ force: true });
};

/**
 * Find the first alert row in the alerts table then click on the host name to open the flyout
 */
export const expandFirstAlertUserFlyout = () => {
  waitForAlerts();
  scrollAlertTableColumnIntoView(USER_COLUMN);
  cy.get(OPEN_USER_FLYOUT_BUTTON).first().click();
};

/**
 * Open the asset criticality modal
 */
export const toggleAssetCriticalityModal = () => {
  cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON).click();
};

/**
 * Open the asset criticality modal
 */
export const selectAssetCriticalityLevel = (option: string) => {
  toggleAssetCriticalityModal();
  cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT).click();
  cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT_OPTION).contains(option).click();
  cy.get(ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SAVE_BTN).click();
};
