/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { AlertsProcessingTable } from './alert_processing_table';
import { formatPercent, type ValueMetrics } from './metrics';
import * as i18n from './translations';
import { AlertProcessingDonut } from './alert_processing_donut';
import { AlertProcessingCompare } from './alert_processing_compare';

interface Props {
  valueMetrics: ValueMetrics;
  valueMetricsCompare: ValueMetrics;
}

export const AlertProcessing: React.FC<Props> = ({ valueMetrics, valueMetricsCompare }) => {
  return (
    <EuiPanel paddingSize="l" hasBorder hasShadow={false}>
      <EuiTitle size="s">
        <h3>{i18n.ALERT_PROCESSING_TITLE}</h3>
      </EuiTitle>
      <EuiText size="s">
        <p>{i18n.ALERT_PROCESSING_DESC}</p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <AlertProcessingDonut valueMetrics={valueMetrics} />
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertsProcessingTable
            totalAlerts={valueMetrics.totalAlerts}
            filteredAlerts={valueMetrics.filteredAlerts}
            escalatedAlerts={valueMetrics.totalAlerts - valueMetrics.filteredAlerts}
            filteredAlertsPerc={formatPercent(valueMetrics.filteredAlertsPerc)}
            escalatedAlertsPerc={formatPercent(valueMetrics.escalatedAlertsPerc)}
          />
          <EuiSpacer size="m" />
          <AlertProcessingCompare
            valueMetrics={valueMetrics}
            valueMetricsCompare={valueMetricsCompare}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
    </EuiPanel>
  );
};
