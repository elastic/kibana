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
  if (
    valueMetrics.filteredAlertsPerc === 0 ||
    valueMetricsCompare.filteredAlertsPerc === 0 ||
    valueMetrics.escalatedAlertsPerc === 0 ||
    valueMetricsCompare.escalatedAlertsPerc === 0
  ) {
    // do not display the compare section if any of the values are 0
    // this avoids showing a 0% change which is not useful
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="xs" direction="column" data-test-subj="alertProcessingCompare">
      <EuiFlexItem grow={false} data-test-subj="alertProcessingCompareTitle">
        <EuiText size="xs">
          <p>{i18n.COMPARED}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false} data-test-subj="alertProcessingCompareFilteringRate">
            <ComparePercentageBadge
              currentCount={valueMetrics.filteredAlertsPerc}
              previousCount={valueMetricsCompare.filteredAlertsPerc}
              stat={formatPercent(valueMetricsCompare.filteredAlertsPerc)}
              statType={i18n.FILTERING_RATE}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj="alertProcessingCompareNonSuspiciousLabel">
            <EuiText size="xs">
              <p>{i18n.NON_SUSPICIOUS_ALERTS}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false} data-test-subj="alertProcessingCompareEscalatedRate">
            <ComparePercentageBadge
              currentCount={valueMetrics.escalatedAlertsPerc}
              previousCount={valueMetricsCompare.escalatedAlertsPerc}
              stat={formatPercent(valueMetricsCompare.escalatedAlertsPerc)}
              statType={i18n.ESCALATED_RATE}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj="alertProcessingCompareEscalatedLabel">
            <EuiText size="xs">
              <p>{i18n.ESCALATED_ALERTS}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
