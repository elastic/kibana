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
import { MonitorMWsCallout } from '../../common/mws_callout/monitor_mws_callout';
import { SummaryPanel } from './summary_panel';

import { useMonitorDetailsPage } from '../use_monitor_details_page';
import { useMonitorRangeFrom } from '../hooks/use_monitor_range_from';
import { MonitorAlerts } from './monitor_alerts';
import { MonitorStatusPanel } from '../monitor_status/monitor_status_panel';
import { MonitorDurationTrend } from './duration_trend';
import { StepDurationPanel } from './step_duration_panel';
import { MonitorDetailsPanelContainer } from './monitor_details_panel_container';
import { LastTestRun } from './last_test_run';
import { LAST_10_TEST_RUNS, TestRunsTable } from './test_runs_table';
import { MonitorPendingWrapper } from '../monitor_pending_wrapper';

export const MonitorSummary = () => {
  const { from, to } = useMonitorRangeFrom();

  const dateLabel = from === 'now-30d/d' ? LAST_30_DAYS_LABEL : TO_DATE_LABEL;

  const redirect = useMonitorDetailsPage();
  if (redirect) {
    return redirect;
  }

  return (
    <MonitorPendingWrapper>
      <MonitorMWsCallout />
      <SummaryPanel dateLabel={dateLabel} from={from} to={to} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" wrap={true} responsive={false}>
        <EuiFlexItem grow={2} css={{ minWidth: 260 }}>
          <MonitorDetailsPanelContainer />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
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
      <EuiSpacer size="m" />
      <MonitorStatusPanel
        from={'now-24h'}
        to={'now'}
        brushable={false}
        showViewHistoryButton={true}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" wrap={true}>
        <EuiFlexItem css={{ minWidth: 430 }}>
          <LastTestRun />
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 260 }}>
          <MonitorAlerts dateLabel={dateLabel} from={from} to={to} />
          <EuiSpacer size="m" />
          <StepDurationPanel legendPosition="bottom" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <LoadWhenInView placeholderTitle={LAST_10_TEST_RUNS}>
        <TestRunsTable paginable={false} from={from} to={to} />
      </LoadWhenInView>
    </MonitorPendingWrapper>
  );
};

const TO_DATE_LABEL = i18n.translate('xpack.synthetics.detailsPanel.toDate', {
  defaultMessage: 'To date',
});

const DURATION_TREND_LABEL = i18n.translate('xpack.synthetics.detailsPanel.durationTrends', {
  defaultMessage: 'Duration trends',
});

const LAST_30_DAYS_LABEL = i18n.translate('xpack.synthetics.detailsPanel.last30Days', {
  defaultMessage: 'Last 30 days',
});
