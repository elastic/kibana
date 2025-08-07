/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON = getDataTestSubjectSelector(
  'tiIndicatorsTableAddToBlockListContextMenu'
);
export const FLYOUT_ADD_TO_BLOCK_LIST_ITEM = getDataTestSubjectSelector(
  'tiIndicatorFlyoutAddToBlockListContextMenu'
);
export const BLOCK_LIST_NAME = getDataTestSubjectSelector('blocklist-form-name-input');
export const BLOCK_LIST_DESCRIPTION = getDataTestSubjectSelector(
  'blocklist-form-description-input'
);
export const BLOCK_LIST_ADD_BUTTON = `[class="eui-textTruncate"]`;
export const BLOCK_LIST_TOAST_LIST = getDataTestSubjectSelector('globalToastList');
export const BLOCK_LIST_VALUE_INPUT = (iocId: string) =>
  getDataTestSubjectSelector(`blocklist-form-values-input-${iocId}`);
export const SAVED_BLOCK_LIST_NAME = getDataTestSubjectSelector('blocklistPage-card-header-title');
export const SAVED_BLOCK_LIST_DESCRIPTION = getDataTestSubjectSelector(
  'blocklistPage-card-description'
);
