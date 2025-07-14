/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useGetPreviewData } from '../../../../hooks/use_get_preview_data';
import { useKibana } from '../../../../hooks/use_kibana';
import { TimeBounds } from '../../types';
import { getDiscoverLink } from '../../utils/get_discover_link';
import { GoodBadEventsChart } from './good_bad_events_chart';
import { MetricTimesliceEventsChart } from './metric_timeslice_events_chart';

export interface Props {
  slo: SLOWithSummaryResponse;
  range: { from: Date; to: Date };
  hideRangeDurationLabel?: boolean;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function EventsChartPanel({ slo, range, hideRangeDurationLabel = false, onBrushed }: Props) {
  const { discover, uiSettings } = useKibana().services;
  const { isLoading, data } = useGetPreviewData({
    range,
    isValid: true,
    indicator: slo.indicator,
    groupings: slo.groupings,
    objective: slo.objective,
    remoteName: slo.remote?.remoteName,
  });

  const canLinkToDiscover = ![
    'sli.apm.transactionErrorRate',
    'sli.apm.transactionDuration',
  ].includes(slo.indicator.type);

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
    if (isLoading) {
      return <EuiLoadingChart size="m" data-test-subj="eventsLoadingChart" />;
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
            {!hideRangeDurationLabel && (
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.slo.sloDetails.eventsChartPanel.duration', {
                    defaultMessage: 'Last 24h',
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {canLinkToDiscover && (
            <EuiFlexItem grow={0}>
              <EuiLink
                color="text"
                href={getDiscoverLink({
                  slo,
                  timeRange: {
                    from: 'now-24h',
                    to: 'now',
                    mode: 'relative',
                  },
                  discover,
                  uiSettings,
                })}
                data-test-subj="sloDetailDiscoverLink"
              >
                <EuiIcon type="sortRight" css={{ marginRight: '4px' }} />
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
