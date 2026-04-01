/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { TimeRange } from '@kbn/es-query';
import React from 'react';
import { useGetPreviewData } from '../../../../hooks/use_get_preview_data';
import type { TimeBounds } from '../../types';
import { GoodBadEventsChart } from './good_bad_events_chart';
import { MetricTimesliceEventsChart } from './metric_timeslice_events_chart';
import { EventsChartPanelActionsMenu } from './events_chart_panel_actions_menu';

export interface Props {
  slo: SLOWithSummaryResponse;
  range: { from: Date; to: Date };
  dynamicTimeRange?: boolean;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function EventsChartPanel({ slo, range, dynamicTimeRange = false, onBrushed }: Props) {
  const timeRange: TimeRange = dynamicTimeRange
    ? { from: range.from.toISOString(), to: range.to.toISOString() }
    : { from: 'now-24h', to: 'now', mode: 'relative' };

  const { isLoading, data } = useGetPreviewData({
    range,
    isValid: true,
    indicator: slo.indicator,
    groupings: slo.groupings,
    objective: slo.objective,
    remoteName: slo.remote?.remoteName,
  });

  function getChartTitle() {
    switch (slo.indicator.type) {
      case 'sli.metric.timeslice':
        return i18n.translate('xpack.slo.sloDetails.eventsChartPanel.timesliceTitle', {
          defaultMessage: 'Timeslice metric',
        });
      default:
        return i18n.translate('xpack.slo.sloDetails.eventsChartPanel.title', {
          defaultMessage: 'Good vs bad events',
        });
    }
  }

  function getChart() {
    const chartHeight = 200;

    if (isLoading) {
      return (
        <div
          css={{
            height: chartHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiLoadingChart size="m" data-test-subj="eventsLoadingChart" />
        </div>
      );
    }

    switch (slo.indicator.type) {
      case 'sli.metric.timeslice':
        return (
          <MetricTimesliceEventsChart slo={slo} data={data?.results ?? []} onBrushed={onBrushed} />
        );

      default:
        return <GoodBadEventsChart data={data?.results ?? []} slo={slo} onBrushed={onBrushed} />;
    }
  }

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="eventsChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={1}>
              <EuiTitle size="xs">
                <h2>{getChartTitle()}</h2>
              </EuiTitle>
            </EuiFlexItem>
            {!dynamicTimeRange && (
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.slo.sloDetails.eventsChartPanel.duration', {
                    defaultMessage: 'Last 24h',
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiFlexItem grow={0}>
            <EventsChartPanelActionsMenu slo={slo} timeRange={timeRange} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem>{getChart()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
