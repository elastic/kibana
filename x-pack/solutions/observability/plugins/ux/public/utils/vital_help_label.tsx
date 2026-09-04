/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiIconTip, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';

/** Label plus an info-icon tip, for KPI stats and non-table headings. */
export function VitalHelpLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <>
      {label}
      <EuiIconTip content={tooltip} type="info" />
    </>
  );
}

/**
 * Column `name` with an info icon. Use this instead of `nameTooltip`:
 * EUI skips the tip on sortable headers and only shows sort arrows.
 */
export function VitalColumnName({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        gap: 4px;
      `}
    >
      {label}
      <EuiToolTip content={tooltip} disableScreenReaderOutput>
        <span
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <EuiIcon type="info" color="subdued" size="s" aria-hidden={true} />
        </span>
      </EuiToolTip>
    </span>
  );
}
