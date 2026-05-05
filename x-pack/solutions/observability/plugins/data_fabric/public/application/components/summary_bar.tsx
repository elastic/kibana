/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

interface SummaryStats {
  sources: number;
  flows: number;
  destinations: number;
  externalDestinations: number;
  totalDocs: string;
  good: number;
  degraded: number;
  poor: number;
}

interface SummaryBarProps {
  stats: SummaryStats;
}

const barStyles = css`
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 0;
`;

const dividerStyles = css`
  width: 1px;
  height: 12px;
  background: var(--euiColorBorderBaseSubdued, #d3dae6);
  margin: 0 8px;
  flex-shrink: 0;
`;

const Divider = () => <span css={dividerStyles} />;

export const SummaryBar = ({ stats }: SummaryBarProps) => {
  return (
    <EuiFlexGroup gutterSize="none" css={barStyles} responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{stats.sources}</strong> sources
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{stats.flows}</strong> flows
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{stats.destinations}</strong> destinations{' '}
              <span style={{ color: 'var(--euiColorMediumShade, #98a2b3)' }}>
                ({stats.externalDestinations} external)
              </span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <Divider />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>{stats.totalDocs}</strong> docs total
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <Divider />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiHealth color="success" textSize="xs">
              Good ({stats.good})
            </EuiHealth>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiHealth color="warning" textSize="xs">
              Degraded ({stats.degraded})
            </EuiHealth>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiHealth color="danger" textSize="xs">
              Poor ({stats.poor})
            </EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
