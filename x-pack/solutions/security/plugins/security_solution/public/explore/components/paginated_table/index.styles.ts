/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    pagination: css`
      @media only screen and (min-width: ${euiTheme.breakpoint.m}) {
        .euiButtonIcon:last-child {
          margin-left: 28px;
        }

        .euiPagination {
          position: relative;
        }

        .euiPagination::before {
          bottom: 0;
          color: ${euiTheme.colors.borderBaseDisabled};
          content: '\\2026';
          font-size: ${euiTheme.size.s};
          padding: 5px ${euiTheme.size.s};
          position: absolute;
          right: ${euiTheme.size.l};
        }
      }
    `,
    table: css`
      tbody {
        th,
        td {
          vertical-align: top;
        }

        .euiTableCellContent {
          display: block;
        }
      }
    `,
    footerAction: css`
      margin-top: ${euiTheme.size.xs};
    `,
  };
};
