/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Adapted from streams_app NestedView (Partitioning tab connection lines) for the
 * EA facelift prototype — security_solution cannot depend on streams_app.
 * Tuned for stacked table rows: seamless full-height trunk, 16px elbows,
 * Borders/base/plain, and uniform row spacing (no first-child drop).
 * @see x-pack/platform/plugins/shared/streams_app/public/components/nested_view
 */

import React from 'react';
import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';

export function NestedView({
  children,
  last,
  isBeingDragged,
}: {
  children: React.ReactNode;
  last?: boolean;
  first?: boolean;
  isBeingDragged?: boolean;
  useDarkBorders?: boolean;
}) {
  const { euiTheme } = useEuiTheme();

  const borderColor = euiTheme.colors.borderBasePlain;
  const borderStyle = `${euiTheme.border.width.thin} solid ${borderColor}`;

  return isBeingDragged ? (
    <>{children}</>
  ) : (
    <div
      className={css`
        box-sizing: border-box;
        /* Fill the table row so stacked trunks meet with no gaps. */
        flex: 1;
        min-inline-size: 0;
        block-size: 100%;
        min-block-size: 36px;
        display: flex;
        align-items: center;
        padding-left: ${euiTheme.size.base};
        margin-left: 8px;
        border-left: ${last ? 'none' : borderStyle};
        position: relative;

        &::before {
          content: '';
          border-bottom: ${borderStyle};
          border-left: ${borderStyle};
          position: absolute;
          top: 0;
          left: ${last ? '0px' : '-1px'};
          /* Match padding-left so the elbow stops at the name padding. */
          width: ${euiTheme.size.base};
          height: 50%;
        }
      `}
    >
      <div
        className={css`
          min-inline-size: 0;
          padding-inline: 6px;
        `}
      >
        {children}
      </div>
    </div>
  );
}
