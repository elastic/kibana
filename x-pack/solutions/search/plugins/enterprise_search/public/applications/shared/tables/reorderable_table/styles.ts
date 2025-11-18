/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { type EuiThemeComputed } from '@elastic/eui';

export const reorderableTableStyles = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    // Disabled draggable
    '.euiDraggable .euiDraggable__item.euiDraggable__item--isDisabled': {
      cursor: 'unset',
    },

    // Header
    '.reorderableTableHeader > .euiFlexGroup': {
      margin: `${euiTheme.size.xs} 0`,
    },

    // No items
    '.reorderableTableNoItems': {
      backgroundColor: euiTheme.colors.emptyShade,
      borderTop: euiTheme.border.thin,
    },

    // Row
    '.reorderableTableRow': {
      backgroundColor: euiTheme.colors.emptyShade,
      borderTop: euiTheme.border.thin,
    },

    // Unorderable rows
    '.unorderableRows .reorderableTableRow': {
      backgroundColor: euiTheme.colors.lightestShade,
    },
  });

export const bodyRowItemStyles = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    margin: `${euiTheme.size.m} 0`,
  });
