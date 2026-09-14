/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CSSObject } from '@emotion/react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiHealth } from '@elastic/eui';

export interface OsControlSelectOptionSpec<TValue extends string> {
  value: TValue;
  label: string;
  healthColor: 'danger' | 'warning' | 'success';
}

/**
 * Truncation for the closed-control (`inputDisplay`) label only. `EuiHealth` is an inline-block
 * flex row, so without a shrinkable label the selected text paints under the SuperSelect chevron
 * instead of ellipsizing. The same node must not be reused for `dropdownDisplay`: the popover
 * has no chevron and should show the full option text, wrapping if needed.
 */
const osControlInputDisplayCss: CSSObject = {
  display: 'block',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  // `EuiHealth` lays out the dot + label as flex items; the label item has to shrink for
  // ellipsis to apply. Child combinators only — no EUI internal class names.
  '& > *': {
    minWidth: 0,
  },
  '& > * > *:last-child': {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

/** Gives every OS-row select the shared severity-dot treatment. */
export const buildOsControlSelectOptions = <TValue extends string>(
  specs: ReadonlyArray<OsControlSelectOptionSpec<TValue>>
): Array<EuiSuperSelectOption<TValue>> =>
  specs.map(({ value, label, healthColor }) => ({
    value,
    inputDisplay: (
      <EuiHealth color={healthColor} textSize="inherit" css={osControlInputDisplayCss}>
        {label}
      </EuiHealth>
    ),
    dropdownDisplay: (
      <EuiHealth color={healthColor} textSize="inherit">
        {label}
      </EuiHealth>
    ),
  }));
