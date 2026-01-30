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
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { getDiscoverLink } from '../../utils/discover_links/get_discover_link';
import type { EventsChartPanelProps } from './types';
import { useEventsChartPanel } from './hooks/use_events_chart_panel';

export function EventsChartPagePanel({
  slo,
  range,
  hideRangeDurationLabel = false,
  onBrushed,
}: EventsChartPanelProps) {
  const { discover, uiSettings } = useKibana().services;

  const { getChart, getChartTitle } = useEventsChartPanel({ slo, range, onBrushed });

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
        </EuiFlexGroup>

        <EuiFlexItem>{getChart()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
