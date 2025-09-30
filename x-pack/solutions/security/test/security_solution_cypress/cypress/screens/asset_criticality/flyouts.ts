/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_SELECTOR = getDataTestSubjectSelector(
  'asset-criticality-selector'
);
export const ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_LEVEL =
  getDataTestSubjectSelector('asset-criticality-level');
export const ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_BUTTON = getDataTestSubjectSelector(
  'asset-criticality-change-btn'
);
export const ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_TITLE = getDataTestSubjectSelector(
  'asset-criticality-modal-title'
);
export const ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT = getDataTestSubjectSelector(
  'asset-criticality-modal-select'
);
export const ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SELECT_OPTION =
  getDataTestSubjectSelector('asset-criticality-modal-select-option');
export const ENTITY_DETAILS_FLYOUT_ASSET_CRITICALITY_MODAL_SAVE_BTN = getDataTestSubjectSelector(
  'asset-criticality-modal-save-btn'
);

export const OPEN_HOST_FLYOUT_BUTTON = getDataTestSubjectSelector('host-details-button');
export const OPEN_USER_FLYOUT_BUTTON = getDataTestSubjectSelector('users-link-anchor');
