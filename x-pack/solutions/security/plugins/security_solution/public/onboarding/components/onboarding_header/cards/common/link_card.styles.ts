/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLOR_MODES_STANDARD, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const useCardStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;

  return css`
    min-width: 315px;
    /* We needed to add the "headerCard" class to make it take priority over the default EUI card styles */
    &.headerCard:hover {
      *:not(.headerCardLink) {
        text-decoration: none;
      }
      .headerCardLink,
      .headerCardLink * {
        text-decoration: underline;
        text-decoration-color: ${euiTheme.colors.textPrimary};
      }
    }

    .headerCardTitle {
      font-weight: ${euiTheme.font.weight.semiBold};
      font-size: 1rem;
    }

    ${isDarkMode
      ? `
          background-color: ${euiTheme.colors.backgroundBasePlain};
          box-shadow: none;
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
        `
      : ''}
  `;
};
