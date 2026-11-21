/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiText, useEuiTheme } from '@elastic/eui';
import { useFormatters } from '../hooks/use_formatters';

export interface BarListItem {
  key: string;
  /** The name of the row, e.g. a link; `key` when left out. */
  label?: ReactNode;
  value: number;
}

/**
 * The count of a row and its share of the total, e.g. `1,200 · 64%`; with `wholePercent`, the
 * share is a whole number whatever the percent format of Kibana says, e.g. `64%` for `63.8%`.
 */
export function ShareValue({
  value,
  total,
  wholePercent = false,
}: {
  value: number;
  total: number;
  wholePercent?: boolean;
}) {
  const { formatNumber, formatPercent } = useFormatters();
  const share = value / total;
  return (
    <EuiText size="xs" className="eui-textNoWrap">
      <strong>{formatNumber(value)}</strong>
      {total > 0 && (
        <EuiText size="xs" color="subdued" component="span">
          {` · ${
            wholePercent ? `${formatNumber(Math.round(share * 100))}%` : formatPercent(share)
          }`}
        </EuiText>
      )}
    </EuiText>
  );
}

/** A bar for the share of a row in a list, sized against the list's total. */
export function ShareBar({ value, total, label }: { value: number; total: number; label: string }) {
  return (
    <EuiProgress
      value={value}
      max={Math.max(total, 1)}
      size="s"
      color="primary"
      aria-label={label}
    />
  );
}

/** A ranked list of names, each with a bar for its share of `total` and its count. */
export function BarList({
  items,
  total,
  wholePercent,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}: {
  items: BarListItem[];
  total: number;
  /** Shows the shares as whole percents, e.g. `30%` and not `30.137%`. */
  wholePercent?: boolean;
  'aria-label': string;
  'data-test-subj'?: string;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <ul
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
      css={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.m }}
    >
      {items.map(({ key, label, value }) => {
        return (
          <li key={key}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
            >
              <EuiFlexItem className="eui-textTruncate">
                <EuiText size="s" className="eui-textTruncate" title={key}>
                  {label ?? key}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ShareValue value={value} total={total} wholePercent={wholePercent} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <ShareBar value={value} total={total} label={key} />
          </li>
        );
      })}
    </ul>
  );
}
