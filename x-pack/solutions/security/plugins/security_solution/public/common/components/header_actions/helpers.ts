/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsType } from '../../../../common/types';

/**
 * This is the effective width in pixels of an action button used with
 * `EuiDataGrid` `leadingControlColumns`. (See Notes below for details)
 *
 * Notes:
 * 1) This constant is necessary because `width` is a required property of
 *    the `EuiDataGridControlColumn` interface, so it must be calculated before
 *    content is rendered. (The width of a `EuiDataGridControlColumn` does not
 *    automatically size itself to fit all the content.)
 *
 * 2) This is the *effective* width, because at the time of this writing,
 *    `EuiButtonIcon` has a `margin-left: -4px`, which is subtracted from the
 *    `width`
 */
export const DEFAULT_ACTION_BUTTON_WIDTH = 28; // px

export const isAlert = (eventType: TimelineEventsType | Omit<TimelineEventsType, 'all'>): boolean =>
  eventType === 'signal';

/**
 * Returns the width of the Actions column based on the number of buttons being
 * displayed
 *
 * NOTE: This function is necessary because `width` is a required property of
 * the `EuiDataGridControlColumn` interface, so it must be calculated before
 * content is rendered. (The width of a `EuiDataGridControlColumn` does not
 * automatically size itself to fit all the content.)
 */
export const getActionsColumnWidth = (actionButtonCount: number): number => {
  const contentWidth =
    actionButtonCount > 0
      ? actionButtonCount * DEFAULT_ACTION_BUTTON_WIDTH
      : DEFAULT_ACTION_BUTTON_WIDTH;

  // `EuiDataGridRowCell` applies additional `padding-left` and
  // `padding-right`, which must be added to the content width to prevent the
  // content from being partially hidden due to the space occupied by padding:
  const leftRightCellPadding = 12;

  return contentWidth + leftRightCellPadding;
};
