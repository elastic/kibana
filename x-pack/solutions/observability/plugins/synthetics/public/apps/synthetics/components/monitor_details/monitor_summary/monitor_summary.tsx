/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LoadWhenInView } from '@kbn/observability-shared-plugin/public';
import { useTestFlyoutOpen } from '../../test_now_mode/hooks/use_test_flyout_open';

import { useMonitorDetailsPage } from '../use_monitor_details_page';
import { useMonitorRangeFrom } from '../hooks/use_monitor_range_from';
import { MonitorAlerts } from './monitor_alerts';
import { MonitorErrorSparklines } from './monitor_error_sparklines';
import { MonitorStatusPanel } from '../monitor_status/monitor_status_panel';
import { DurationSparklines } from './duration_sparklines';
import { MonitorDurationTrend } from './duration_trend';
import { StepDurationPanel } from './step_duration_panel';
import { AvailabilityPanel } from './availability_panel';
import { DurationPanel } from './duration_panel';
import { MonitorDetailsPanelContainer } from './monitor_details_panel_container';
import { AvailabilitySparklines } from './availability_sparklines';
import { LastTestRun } from './last_test_run';
import { LAST_10_TEST_RUNS, TestRunsTable } from './test_runs_table';
import { MonitorErrorsCount } from './monitor_errors_count';
import { MonitorPendingWrapper } from '../monitor_pending_wrapper';

export const MonitorSummary = () => {
  const { from, to } = useMonitorRangeFrom();

  const isFlyoutOpen = !!useTestFlyoutOpen();

  const dateLabel = from === 'now-30d/d' ? LAST_30_DAYS_LABEL : TO_DATE_LABEL;

  const redirect = useMonitorDetailsPage();
  if (redirect) {
    return redirect;
  }

  return (
    <MonitorPendingWrapper>
      <EuiFlexGroup gutterSize="m" wrap={true} responsive={false}>
        <EuiFlexItem grow={1} css={{ flexBasis: '36%', minWidth: 260 }}>
          <MonitorDetailsPanelContainer />
        </EuiFlexItem>
        <EuiFlexItem grow={1} css={{ flexBasis: '60%' }}>
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
            <EuiFlexGroup gutterSize="s" wrap={true}>
              <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
                <EuiFlexItem grow={false}>
                  <AvailabilityPanel from={from} to={to} id="availabilityPercentageSummary" />
                </EuiFlexItem>
                <EuiFlexItem css={{ minWidth: 100 }}>
                  <AvailabilitySparklines from={from} to={to} id="availabilitySparklineSummary" />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
                <EuiFlexItem grow={false} css={{ minWidth: 86 }}>
                  <DurationPanel from={from} to={to} id="durationAvgValueSummary" />
                </EuiFlexItem>
                <EuiFlexItem css={{ minWidth: 100 }}>
                  <DurationSparklines from={from} to={to} id="durationAvgSparklineSummary" />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
                <EuiFlexItem grow={false}>
                  <MonitorErrorsCount from={from} to={to} id="monitorErrorsCountSummary" />
                </EuiFlexItem>
                <EuiFlexItem css={{ minWidth: 100 }}>
                  <MonitorErrorSparklines from={from} to={to} id="monitorErrorsSparklineSummary" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPanel hasShadow={false} paddingSize="m" hasBorder>
                <EuiFlexGroup alignItems="center" gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>{DURATION_TREND_LABEL}</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText color="subdued" size="s">
                      {dateLabel}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <MonitorDurationTrend from={from} to={to} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <MonitorStatusPanel
        from={'now-24h'}
        to={'now'}
        brushable={false}
        showViewHistoryButton={true}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" wrap={true}>
        <EuiFlexItem css={isFlyoutOpen ? { minWidth: 260, maxWidth: 500 } : { maxWidth: 500 }}>
          <LastTestRun />
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 260 }}>
          <MonitorAlerts dateLabel={dateLabel} from={from} to={to} />
          <EuiSpacer size="m" />
          <StepDurationPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <LoadWhenInView placeholderTitle={LAST_10_TEST_RUNS}>
        <TestRunsTable paginable={false} from={from} to={to} />
      </LoadWhenInView>
    </MonitorPendingWrapper>
  );
};

const SUMMARY_LABEL = i18n.translate('xpack.synthetics.detailsPanel.summary', {
  defaultMessage: 'Summary',
});

const TO_DATE_LABEL = i18n.translate('xpack.synthetics.detailsPanel.toDate', {
  defaultMessage: 'To date',
});

const DURATION_TREND_LABEL = i18n.translate('xpack.synthetics.detailsPanel.durationTrends', {
  defaultMessage: 'Duration trends',
});

const LAST_30_DAYS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last30Days', {
  defaultMessage: 'Last 30 days',
});
