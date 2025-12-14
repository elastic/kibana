/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SlosCardProps {
  height?: number;
}

interface MetricItemProps {
  value: number;
  label: string;
  color?: string;
}

const MetricItem: React.FC<MetricItemProps> = ({ value, label, color }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div style={{ textAlign: 'left' }}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
      <EuiText
        style={{ fontSize: '24px', fontWeight: 700, color: color || euiTheme.colors.primary }}
      >
        {value}
      </EuiText>
    </div>
  );
};

/**
 * SLOs card with fake data for demonstration purposes.
 * TODO: Replace with real SLO data from the SLO API.
 */
export const SlosCard: React.FC<SlosCardProps> = ({ height = 120 }) => {
  const { euiTheme } = useEuiTheme();

  // Fake SLO data for demonstration
  const violated = 2;
  const degrading = 1;
  const healthy = 24;
  const stale = 0;
  const noData = 12;

  return (
    <div
      style={{
        height: `100%`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <EuiText size="m" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.slosLabel', {
          defaultMessage: 'SLOs',
        })}
      </EuiText>
      <EuiFlexGroup gutterSize="none" responsive={false} alignItems="flexEnd" style={{ flex: 1 }}>
        <EuiFlexItem>
          <MetricItem
            value={violated}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.violatedLabel', {
              defaultMessage: 'Violated',
            })}
            color={euiTheme.colors.danger}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={degrading}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.degradingLabel', {
              defaultMessage: 'Degrading',
            })}
            color={euiTheme.colors.warning}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={healthy}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.healthyLabel', {
              defaultMessage: 'Healthy',
            })}
            color={euiTheme.colors.success}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={stale}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.staleLabel', {
              defaultMessage: 'Stale',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricItem
            value={noData}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.noDataLabel', {
              defaultMessage: 'No data',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
