/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import styled from '@emotion/styled';
import { EuiBasicTable } from '@elastic/eui';

// @ts-expect-error TS2769
export const StyledBasicTable: typeof EuiBasicTable = styled(EuiBasicTable)`
  .euiTableRow {
    .euiTableRowCell {
      border-bottom: none !important;
    }
  }

  .inlineActions button {
    opacity: 0;
  }

  .EntityAnalyticsTableHoverActions {
    .inlineActions-popoverOpen button {
      opacity: 1;
    }

    .inline-actions-table-cell {
      .inlineActions button:focus-visible,
      &:hover .inlineActions button {
        opacity: 1;
      }
    }
  }
`;
