/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';

export const AnalyticsCollectionTableStyles = (euiTheme: EuiThemeComputed) => {
  return {
    button: {
      '&.euiButtonGroupButton': {
        '&:focus-within': {
          outline: 'none !important',
          textDecoration: 'none !important',
        },
        height: 38,
      },
    },
    buttonGroup: {
      '.euiButtonGroup__buttons': {
        backgroundColor: euiTheme.colors.emptyShade,
        height: 40,
      },
    },
    newCollection: { background: 'none', border: euiTheme.border.thin },
  };
};
