/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SloBurnRateCardProps {
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
      <EuiText style={{ fontSize: '24px', fontWeight: 700, color: color || euiTheme.colors.text }}>
        {value}
      </EuiText>
    </div>
  );
};

/**
 * SLO Burn Rate card with fake data for demonstration purposes.
 * TODO: Replace with real burn rate data from the SLO API.
 */
export const SloBurnRateCard: React.FC<SloBurnRateCardProps> = ({ height = 120 }) => {
  const { euiTheme } = useEuiTheme();

  // Fake burn rate data for demonstration (matching the attached image)
  const activeAlerts = 103;
  const recoveredAlerts = 32;
  const rules = 100;

  return (
    <div
      style={{
        height: `100%`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <EuiText size="m" style={{ fontWeight: 700 }}>
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.burnRateLabel', {
          defaultMessage: 'Burn rate',
        })}
      </EuiText>
      <EuiFlexGroup gutterSize="xl" responsive={false} alignItems="flexEnd" style={{ flex: 1 }}>
        <EuiFlexItem grow={false}>
          <MetricItem
            value={activeAlerts}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.activeAlertsLabel', {
              defaultMessage: 'Active alerts',
            })}
            color={euiTheme.colors.danger}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricItem
            value={recoveredAlerts}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.recoveredAlertsLabel', {
              defaultMessage: 'Recovered alerts',
            })}
            color={euiTheme.colors.success}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricItem
            value={rules}
            label={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.rulesLabel', {
              defaultMessage: 'Rules',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
