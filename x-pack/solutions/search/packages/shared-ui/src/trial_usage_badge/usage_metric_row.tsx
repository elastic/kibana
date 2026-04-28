/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiProgress, EuiText } from '@elastic/eui';

export interface UsageMetricRowProps {
  label: string;
  tooltip: string;
  value: string;
  progressValue?: number;
  progressMax?: number;
  subtitle: string;
}

function getProgressColor(value: number, max: number): 'primary' | 'warning' | 'danger' {
  const percent = (value / max) * 100;
  if (percent > 95) return 'danger';
  if (percent >= 80) return 'warning';
  return 'primary';
}

export const UsageMetricRow: React.FC<UsageMetricRowProps> = ({
  label,
  tooltip,
  value,
  progressValue,
  progressMax,
  subtitle,
}) => (
  <EuiFlexGroup gutterSize="xs" direction="column">
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{label}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip type="question" content={tooltip} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">{value}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>

    {progressValue !== undefined && progressMax !== undefined && (
      <EuiProgress
        value={progressValue}
        max={progressMax}
        size="s"
        color={getProgressColor(progressValue, progressMax)}
      />
    )}

    <EuiText size="xs" color="subdued">
      {subtitle}
    </EuiText>
  </EuiFlexGroup>
);
