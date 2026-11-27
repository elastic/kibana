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
 * A KPI panel of a KPI row: the label on top, and the value with the change and the previous value
 * beside each other below it, at the bottom, so the values of a row line up whatever the length of
 * the labels. The line of the change is reserved, so toggling Compare moves nothing; the value
 * keeps its place while loading, so the row does not jump.
 */
export function KpiPanel({
  label,
  hint,
  value,
  isEmpty = false,
  isLoading,
  change,
  previous,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  /** How the value is calculated. */
  hint?: string;
  value: ReactNode;
  /** The value says there is none, e.g. not enough data: shown as a note, not as a number. */
  isEmpty?: boolean;
  isLoading: boolean;
  /** Below the value, e.g. its change against the previous period. */
  change?: ReactNode;
  /** Beside the change, e.g. the value of the previous period. */
  previous?: ReactNode;
  'data-test-subj': string;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem css={{ minInlineSize: euiTheme.base * 9 }}>
      <EuiPanel hasBorder paddingSize="m" css={{ blockSize: '100%' }}>
        <div
          data-test-subj={dataTestSubj}
          css={{
            display: 'flex',
            flexDirection: 'column',
            blockSize: '100%',
            minBlockSize: euiTheme.base * 7,
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
            <EuiSkeletonTitle isLoading={isLoading} size="m">
              {isEmpty ? (
                <EuiText size="s" color="subdued">
                  <p>{value}</p>
                </EuiText>
              ) : (
                <EuiTitle size="m">
                  <p css={{ whiteSpace: 'nowrap' }}>{value}</p>
                </EuiTitle>
              )}
            </EuiSkeletonTitle>
            {/* Always as tall as the change, so the value keeps its place with Compare on or off. */}
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              css={{
                minBlockSize: euiTheme.size.l,
                // In a narrow page, as the panels of the Overview get in then, they take a line each.
                '@container (max-width: 759px)': {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: euiTheme.size.xs,
                  minBlockSize: 0,
                },
              }}
            >
              {change && <EuiFlexItem grow={false}>{change}</EuiFlexItem>}
              {/* On one line whatever the width; a previous value too long for it is cut. */}
              {previous && <EuiFlexItem css={{ minInlineSize: 0 }}>{previous}</EuiFlexItem>}
            </EuiFlexGroup>
          </div>
        </div>
      </EuiPanel>
    </EuiFlexItem>
  );
}
