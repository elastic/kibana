/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import type {
  EuiDataGridCustomBodyProps,
  EuiDataGridStyleCellPaddings,
  EuiThemeComputed,
} from '@elastic/eui';

export const gridRowCss = css`
  inline-size: fit-content;
  min-inline-size: 100%;
`;

export const gridRowCellsCss = css`
  display: flex;
`;

/** Pulses opacity only, which the compositor animates without repainting. */
const loadingPulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

/** A placeholder for a value still loading; its size and color are up to the caller. */
export const loadingPlaceholderCss = css`
  display: inline-block;
  vertical-align: middle;
  animation: ${loadingPulse} 1.2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/** EUI grid row heights for the compact (s), normal (m) and expanded (l) densities. */
export const ROW_HEIGHT_PX: Record<EuiDataGridStyleCellPaddings, number> = { s: 25, m: 37, l: 41 };

export const getCellPaddingBlock = (
  euiTheme: EuiThemeComputed,
  cellPadding: EuiDataGridStyleCellPaddings
): string => {
  if (cellPadding === 's') return euiTheme.size.xs;
  if (cellPadding === 'l') return euiTheme.size.s;
  return '6px';
};

export const getColumnWidth = (col: EuiDataGridCustomBodyProps['visibleColumns'][number]): number =>
  'width' in col && typeof col.width === 'number'
    ? col.width
    : ('initialWidth' in col && col.initialWidth) || 150;
