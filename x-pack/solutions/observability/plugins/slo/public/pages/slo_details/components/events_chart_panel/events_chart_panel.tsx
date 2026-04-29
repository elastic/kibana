/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { TimeRange } from '@kbn/es-query';
import React, { useCallback, useMemo } from 'react';
import { isApmIndicatorType } from '../../../../utils/slo/indicator';
import { useGetPreviewData } from '../../../../hooks/use_get_preview_data';
import { useFetchApmIndices } from '../../../../hooks/use_fetch_apm_indices';
import { useKibana } from '../../../../hooks/use_kibana';
import type { SloEventType, TimeBounds } from '../../types';
import { GoodBadEventsChart } from './good_bad_events_chart';
import { MetricTimesliceEventsChart } from './metric_timeslice_events_chart';
import { getDiscoverLink, openInDiscover } from '../../utils/discover_links/get_discover_link';
import {
  getApmTracesEsqlLink,
  navigateToApmTracesEsqlLink,
} from '../../utils/discover_links/get_apm_traces_esql_link';

export interface Props {
  slo: SLOWithSummaryResponse;
  range: { from: Date; to: Date };
  dynamicTimeRange?: boolean;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function EventsChartPanel({ slo, range, dynamicTimeRange = false, onBrushed }: Props) {
  const { discover, uiSettings } = useKibana().services;

  const isApmSlo = isApmIndicatorType(slo.indicator);

  const {
    data: { transaction: transactionIndex },
  } = useFetchApmIndices({ enabled: isApmSlo });

  const timeRange: TimeRange = useMemo(
    () =>
      dynamicTimeRange
        ? { from: range.from.toISOString(), to: range.to.toISOString() }
        : { from: 'now-24h', to: 'now', mode: 'relative' },
    [dynamicTimeRange, range]
  );

  const { isLoading, data } = useGetPreviewData({
    range,
    isValid: true,
    indicator: slo.indicator,
    groupings: slo.groupings,
    objective: slo.objective,
    remoteName: slo.remote?.remoteName,
  });

  const viewEventsHref = useMemo(
    () =>
      isApmSlo
        ? getApmTracesEsqlLink({ slo, timeRange, discover, transactionIndex })
        : getDiscoverLink({ slo, timeRange, discover, uiSettings }),
    [isApmSlo, slo, timeRange, discover, transactionIndex, uiSettings]
  );

  const handleGoodBadEventsBarClick = useCallback(
    (barTimeRange: TimeRange, eventType: SloEventType) => {
      if (isApmSlo) {
        navigateToApmTracesEsqlLink({
          slo,
          timeRange: barTimeRange,
          discover,
          transactionIndex,
          selectedEventType: eventType,
        });
      } else {
        openInDiscover({
          slo,
          showGood: eventType === 'Good',
          showBad: eventType === 'Bad',
          timeRange: barTimeRange,
          discover,
          uiSettings,
        });
      }
    },
    [isApmSlo, slo, discover, transactionIndex, uiSettings]
  );

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
        return (
          <GoodBadEventsChart
            data={data?.results ?? []}
            slo={slo}
            onBrushed={onBrushed}
            onBarClick={handleGoodBadEventsBarClick}
          />
        );
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

          {viewEventsHref && (
            <EuiFlexItem grow={0}>
              <EuiLink
                href={viewEventsHref}
                data-test-subj="sloDetailDiscoverLink"
                data-source={slo.indicator.type}
                data-action={
                  slo.indicator.type !== 'sli.metric.timeslice' ? 'viewGoodVsBadEvents' : undefined
                }
              >
                <FormattedMessage
                  id="xpack.slo.sloDetails.viewEventsLink"
                  defaultMessage="View events"
                />
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiFlexItem>{getChart()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
