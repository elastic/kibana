/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_SETTINGS_MENU_BUTTON =
  getDataTestSubjectSelector('settingsMenuButton');
export const DOCUMENT_DETAILS_FLYOUT_FLYOUT_TYPE_BUTTON_GROUP = getDataTestSubjectSelector(
  'settingsMenuFlyoutTypeButtonGroup'
);
export const DOCUMENT_DETAILS_FLYOUT_OVERLAY_OPTION = getDataTestSubjectSelector(
  'settingsMenuFlyoutTypeButtonGroupOverlayOption'
);
export const DOCUMENT_DETAILS_FLYOUT_PUSH_OPTION = getDataTestSubjectSelector(
  'settingsMenuFlyoutTypeButtonGroupPushOption'
);
