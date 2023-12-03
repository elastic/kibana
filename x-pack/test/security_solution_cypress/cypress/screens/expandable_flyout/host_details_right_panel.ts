/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const HOST_DETAILS_FLYOUT_SECTION_HEADER = getDataTestSubjectSelector('host-details-header');
export const HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR = getDataTestSubjectSelector(
  'asset-criticality-selector'
);
export const HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL = getDataTestSubjectSelector('risk-score');
export const HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON = getDataTestSubjectSelector(
  'asset-criticality-change-btn'
);
export const HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_TITLE = getDataTestSubjectSelector(
  'asset-criticality-modal-title'
);
export const HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_DROPDOWN = getDataTestSubjectSelector(
  'asset-criticality-modal-select-dropdown'
);
export const HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SAVE_BTN = getDataTestSubjectSelector(
  'asset-criticality-modal-save-btn'
);

export const toggleAssetCriticalityAccordion = () => {
  cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR).scrollIntoView();
  cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR).should('be.visible').click();
};

export const toggleAssetCriticalityModal = () => {
  toggleAssetCriticalityAccordion();

  cy.get(HOST_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON).should('be.visible').click();
};
