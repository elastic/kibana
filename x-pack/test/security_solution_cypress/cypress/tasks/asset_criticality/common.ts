/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USER_COLUMN } from '../../screens/alerts';
import {
  OPEN_HOST_FLYOUT_BUTTON,
  OPEN_USER_FLYOUT_BUTTON,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT_OPTION,
  HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SAVE_BTN,
} from '../../screens/asset_criticality/flyouts';
import { scrollAlertTableColumnIntoView } from '../alerts';

/**
 * Find the first alert row in the alerts table then click on the host name to open the flyout
 */
export const expandFirstAlertHostFlyout = () => {
  cy.get(OPEN_HOST_FLYOUT_BUTTON).first().click();
};

/**
 * Find the first alert row in the alerts table then click on the host name to open the flyout
 */
export const expandFirstAlertUserFlyout = () => {
  scrollAlertTableColumnIntoView(USER_COLUMN);
  cy.get(OPEN_USER_FLYOUT_BUTTON).first().click();
};

/**
 * Open the asset criticality accordion
 */
export const toggleAssetCriticalityAccordion = () => {
  cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR).click();
};

/**
 * Open the asset criticality modal
 */
export const toggleAssetCriticalityModal = () => {
  toggleAssetCriticalityAccordion();
  cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON).click();
};

/**
 * Open the asset criticality modal
 */
export const selectAssetCriticalityLevel = (option: string) => {
  toggleAssetCriticalityAccordion();
  toggleAssetCriticalityModal();
  cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT).click();
  cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT_OPTION).contains(option).click();
  cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SAVE_BTN).click();
};
