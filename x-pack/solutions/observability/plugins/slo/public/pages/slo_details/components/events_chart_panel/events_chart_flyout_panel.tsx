/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { getDiscoverLink } from '../../utils/discover_links/get_discover_link';
import { useEventsChartPanel } from './hooks/use_events_chart_panel';
import { SloFlyoutPanel } from '../../shared_flyout/flyout_panel';
import type { EventsChartPanelProps } from './types';
import { useSloDetailsContext } from '../slo_details_context';

export function EventsChartFlyoutPanel({ range, onBrushed }: EventsChartPanelProps) {
  const { slo } = useSloDetailsContext();
  const { discover, uiSettings } = useKibana().services;

  const { getChart, getChartTitle } = useEventsChartPanel({ range, onBrushed });

  return (
    <SloFlyoutPanel
      title={getChartTitle()}
      renderTooltip
      append={
        <EuiLink
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
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.slo.sloDetails.viewEventsLink"
              defaultMessage="View events"
            />
          </EuiText>
        </EuiLink>
      }
    >
      {getChart({ showLegend: false })}
    </SloFlyoutPanel>
  );
}
