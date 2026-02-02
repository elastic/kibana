/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { SloTabId } from '@kbn/deeplinks-observability';
import { ALERTS_TAB_ID, DEFINITION_TAB_ID, HISTORY_TAB_ID } from '@kbn/deeplinks-observability';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { BurnRatePanel } from './burn_rate_panel/burn_rate_panel';
import { EventsChartPanel } from './events_chart_panel/events_chart_panel';
import { HistoricalDataCharts } from './historical_data_charts';
import { SloDetailsHistory } from './history/slo_details_history';
import { Definition } from './definition/definition';
import { SloDetailsAlerts } from './slo_detail_alerts';
import { SloHealthCallout } from './slo_health_callout';
import { SloRemoteCallout } from './slo_remote_callout';
import { ActionModalProvider } from '../../../context/action_modal';

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
  selectedTabId: SloTabId;
}
export function SloDetails({ slo, isAutoRefreshing, selectedTabId }: Props) {
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
    return <SloDetailsHistory slo={slo} />;
  }

  if (selectedTabId === DEFINITION_TAB_ID) {
    return <Definition slo={slo} />;
  }

  if (selectedTabId === ALERTS_TAB_ID) {
    return <SloDetailsAlerts slo={slo} />;
  }

  return (
    <ActionModalProvider>
      <EuiFlexGroup direction="column" gutterSize="xl">
        <SloRemoteCallout slo={slo} />
        <SloHealthCallout slo={slo} />

        <EuiFlexGroup direction="column" gutterSize="l">
          <BurnRatePanel slo={slo} isAutoRefreshing={isAutoRefreshing} />
          <HistoricalDataCharts slo={slo} isAutoRefreshing={isAutoRefreshing} />
          <EventsChartPanel slo={slo} range={range} />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </ActionModalProvider>
  );
}
