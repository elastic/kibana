/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

/**
 * A KPI panel of a KPI row: the label on top, and the change, the value and the previous value
 * stacked at the bottom, so the values of a row line up whatever the length of the labels. The
 * panel keeps its height with or without the change and the previous value, so toggling Compare
 * does not resize the row; the value keeps its place while loading, so the row does not jump.
 */
export function KpiPanel({
  label,
  hint,
  value,
  isLoading,
  change,
  previous,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  /** How the value is calculated. */
  hint?: string;
  value: ReactNode;
  isLoading: boolean;
  /** Above the value, at the right, e.g. its change against the previous period. */
  change?: ReactNode;
  /** Below the value, e.g. the value of the previous period. */
  previous?: ReactNode;
  'data-test-subj': string;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem>
      <EuiPanel hasBorder paddingSize="m" css={{ blockSize: '100%' }}>
        <div
          data-test-subj={dataTestSubj}
          css={{
            display: 'flex',
            flexDirection: 'column',
            blockSize: '100%',
            minBlockSize: euiTheme.base * 8,
          }}
        >
          <EuiFlexGroup alignItems="flexStart" gutterSize="xs" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {label}
              </EuiText>
            </EuiFlexItem>
            {hint && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={hint}
                  type="info"
                  iconProps={{ 'data-test-subj': `${dataTestSubj}Hint` }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <div css={{ marginBlockStart: 'auto' }}>
            {change && (
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" responsive={false}>
                <EuiFlexItem grow={false}>{change}</EuiFlexItem>
              </EuiFlexGroup>
            )}
            <EuiSkeletonTitle isLoading={isLoading} size="m">
              <EuiTitle size="m">
                <p>{value}</p>
              </EuiTitle>
            </EuiSkeletonTitle>
            {previous}
          </div>
        </div>
      </EuiPanel>
    </EuiFlexItem>
  );
}
