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
import { SloTabId } from '../slo_details';
import { EventsAreaChart } from './events_area_chart';
import { GoodBadEventsChart } from './good_bad_events_chart';

export interface Props {
  slo: SLOWithSummaryResponse;
  range: { from: Date; to: Date };
  selectedTabId: SloTabId;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function EventsChartPanel({ slo, range, selectedTabId, onBrushed }: Props) {
  const { discover, uiSettings } = useKibana().services;

  const { isLoading, data } = useGetPreviewData({
    range,
    isValid: true,
    indicator: slo.indicator,
    groupings: slo.groupings,
    objective: slo.objective,
    remoteName: slo.remote?.remoteName,
  });

  const title =
    slo.indicator.type !== 'sli.metric.timeslice' ? (
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.slo.sloDetails.eventsChartPanel.title', {
            defaultMessage: 'Good vs bad events',
          })}
        </h2>
      </EuiTitle>
    ) : (
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.slo.sloDetails.eventsChartPanel.timesliceTitle', {
            defaultMessage: 'Timeslice metric',
          })}
        </h2>
      </EuiTitle>
    );

  const canLinkToDiscover = ![
    'sli.apm.transactionErrorRate',
    'sli.apm.transactionDuration',
  ].includes(slo.indicator.type);

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="eventsChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={1}>{title}</EuiFlexItem>
            {selectedTabId !== 'history' && (
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
                <EuiIcon type="sortRight" style={{ marginRight: '4px' }} />
                <FormattedMessage
                  id="xpack.slo.sloDetails.viewEventsLink"
                  defaultMessage="View events"
                />
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiFlexItem>
          {slo.indicator.type !== 'sli.metric.timeslice' ? (
            <GoodBadEventsChart isLoading={isLoading} data={data} slo={slo} onBrushed={onBrushed} />
          ) : (
            <>
              {isLoading && (
                <EuiLoadingChart size="m" mono data-test-subj="sliEventsChartLoading" />
              )}

              {!isLoading && <EventsAreaChart slo={slo} data={data} onBrushed={onBrushed} />}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
