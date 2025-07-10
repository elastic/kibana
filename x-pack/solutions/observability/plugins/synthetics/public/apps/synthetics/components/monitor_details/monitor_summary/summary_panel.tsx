/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AvailabilityPanel } from './availability_panel';
import { AvailabilitySparklines } from './availability_sparklines';
import { DurationPanel } from './duration_panel';
import { DurationSparklines } from './duration_sparklines';
import { MonitorErrorsCount } from './monitor_errors_count';
import { MonitorErrorSparklines } from './monitor_error_sparklines';

export const SummaryPanel = ({
  dateLabel,
  from,
  to,
}: {
  dateLabel: string;
  from: string;
  to: string;
}) => {
  return (
    <EuiPanel hasShadow={false} grow={false} hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{SUMMARY_LABEL}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {dateLabel}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="m" wrap={true}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
            <EuiFlexItem grow={false} css={{ minWidth: 120 }}>
              <AvailabilityPanel from={from} to={to} id="availabilityPercentageSummary" />
            </EuiFlexItem>
            <EuiFlexItem css={{ minWidth: 100 }}>
              <AvailabilitySparklines from={from} to={to} id="availabilitySparklineSummary" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
            <EuiFlexItem grow={false} css={{ minWidth: 120 }}>
              <DurationPanel from={from} to={to} id="durationAvgValueSummary" />
            </EuiFlexItem>
            <EuiFlexItem css={{ minWidth: 100 }}>
              <DurationSparklines from={from} to={to} id="durationAvgSparklineSummary" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
            <EuiFlexItem grow={false} css={{ minWidth: 80 }}>
              <MonitorErrorsCount from={from} to={to} id="monitorErrorsCountSummary" />
            </EuiFlexItem>
            <EuiFlexItem css={{ minWidth: 100 }}>
              <MonitorErrorSparklines from={from} to={to} id="monitorErrorsSparklineSummary" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const SUMMARY_LABEL = i18n.translate('xpack.synthetics.detailsPanel.summary', {
  defaultMessage: 'Summary',
});
