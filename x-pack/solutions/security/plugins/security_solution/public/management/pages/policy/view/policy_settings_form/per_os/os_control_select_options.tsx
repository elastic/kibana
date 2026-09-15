/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CSSObject } from '@emotion/react';
import type { EuiSuperSelectOption, UseEuiTheme } from '@elastic/eui';
import { EuiHealth, EuiIcon } from '@elastic/eui';

export interface OsControlSelectOptionSpec<TValue extends string> {
  value: TValue;
  label: string;
  healthColor: 'danger' | 'warning' | 'success';
}

// Closed-control truncation is owned markup (dot + label), not EuiHealth internals.
const osControlInputDisplayCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  display: 'flex',
  alignItems: 'center',
  gap: euiTheme.size.xs,
  minWidth: 0,
  width: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
});

const osControlInputLabelCss: CSSObject = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** Gives every OS-row select the shared severity-dot treatment. */
export const buildOsControlSelectOptions = <TValue extends string>(
  specs: ReadonlyArray<OsControlSelectOptionSpec<TValue>>
): Array<EuiSuperSelectOption<TValue>> =>
  specs.map(({ value, label, healthColor }) => ({
    value,
    inputDisplay: (
      <span css={osControlInputDisplayCss}>
        <EuiIcon type="dot" color={healthColor} aria-hidden={true} />
        <span css={osControlInputLabelCss}>{label}</span>
      </span>
    ),
    dropdownDisplay: (
      <EuiHealth color={healthColor} textSize="inherit">
        {label}
      </EuiHealth>
    ),
  }));
