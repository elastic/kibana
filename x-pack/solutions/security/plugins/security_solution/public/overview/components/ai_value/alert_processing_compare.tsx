/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import * as i18n from './translations';
import { formatPercent, type ValueMetrics } from './metrics';
import { ComparePercentageBadge } from './compare_percentage_badge';

interface Props {
  valueMetrics: ValueMetrics;
  valueMetricsCompare: ValueMetrics;
}

export const AlertProcessingCompare: React.FC<Props> = ({ valueMetrics, valueMetricsCompare }) => {
  return (
    <EuiFlexGroup gutterSize="xs" direction="column">
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <p>{i18n.COMPARED}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <ComparePercentageBadge
              currentCount={valueMetrics.filteredAlertsPerc}
              previousCount={valueMetricsCompare.filteredAlertsPerc}
              stat={formatPercent(valueMetricsCompare.filteredAlertsPerc)}
              statType={i18n.FILTERING_RATE}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <p>{i18n.NON_SUSPICIOUS}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <ComparePercentageBadge
              currentCount={valueMetrics.escalatedAlertsPerc}
              previousCount={valueMetricsCompare.escalatedAlertsPerc}
              stat={formatPercent(valueMetricsCompare.escalatedAlertsPerc)}
              statType={i18n.ESCALATED_RATE}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <p>{i18n.ESCALATED_ALERTS}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
