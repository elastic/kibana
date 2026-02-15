/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import type { SloTabId } from '@kbn/deeplinks-observability';
import { ALERTS_TAB_ID, DEFINITION_TAB_ID, HISTORY_TAB_ID } from '@kbn/deeplinks-observability';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { BurnRatePanel } from './burn_rate_panel';
import { EventsChartPanel } from './events_chart_panel';
import { HistoricalDataCharts } from './historical_data_charts/historical_data_charts';
import { SloDetailsHistory } from './history/slo_details_history';
import { SloHealthCallout } from './slo_health_callout';
import { SloRemoteCallout } from './slo_remote_callout';
import { ActionModalProvider } from '../../../context/action_modal';
import { SloDetailsDefinition } from './definition';
import { SloDetailsAlerts } from './alerts';
import { useSloDetailsContext } from './slo_details_context';

export interface Props {
  selectedTabId: SloTabId;
}

export function SloDetails({ selectedTabId }: Props) {
  const { isAutoRefreshing } = useSloDetailsContext();
  const [range, setRange] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date();
    return {
      from: moment(now).subtract(1, 'day').toDate(),
      to: now,
    };
  });

  useEffect(() => {
    let intervalId: any;
    if (isAutoRefreshing) {
      intervalId = setInterval(() => {
        const now = new Date();
        setRange({ from: moment(now).subtract(1, 'day').toDate(), to: now });
      }, 60 * 1000);
    }

    return () => clearInterval(intervalId);
  }, [isAutoRefreshing]);

  if (selectedTabId === HISTORY_TAB_ID) {
    return <SloDetailsHistory />;
  }

  if (selectedTabId === DEFINITION_TAB_ID) {
    return <SloDetailsDefinition />;
  }

  if (selectedTabId === ALERTS_TAB_ID) {
    return <SloDetailsAlerts />;
  }

  return (
    <ActionModalProvider>
      <EuiFlexGroup direction="column" gutterSize="xl">
        <SloRemoteCallout />
        <SloHealthCallout />

        <EuiFlexGroup direction="column" gutterSize="l">
          <BurnRatePanel />
          <HistoricalDataCharts />
          <EventsChartPanel range={range} />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </ActionModalProvider>
  );
}
