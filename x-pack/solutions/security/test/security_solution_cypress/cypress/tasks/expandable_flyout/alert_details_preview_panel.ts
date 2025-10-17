/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER_LINK,
  PREVIEW_BACK_BUTTON,
  PREVIEW_CLOSE_BUTTON,
} from '../../screens/expandable_flyout/alert_details_preview_panel';

/**
 * Close preview panel
 */
export const closePreview = () => {
  cy.get(PREVIEW_CLOSE_BUTTON).click();
};

/**
 * Go to previous preview
 */
export const goToPreviousPreview = () => {
  cy.get(PREVIEW_BACK_BUTTON).click();
};

/**
 * Click link in footer to open document details flyout
 */
export const openNewFlyout = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_PREVIEW_FOOTER_LINK).click();
};
