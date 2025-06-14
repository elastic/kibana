/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
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

export const TAB_ID_URL_PARAM = 'tabId';
export const OVERVIEW_TAB_ID = 'overview';
export const HISTORY_TAB_ID = 'history';
export const DEFINITION_TAB_ID = 'definition';
export const ALERTS_TAB_ID = 'alerts';

export type SloTabId =
  | typeof OVERVIEW_TAB_ID
  | typeof ALERTS_TAB_ID
  | typeof HISTORY_TAB_ID
  | typeof DEFINITION_TAB_ID;

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
    return <SloDetailsHistory slo={slo} isAutoRefreshing={isAutoRefreshing} />;
  }

  if (selectedTabId === DEFINITION_TAB_ID) {
    return <Definition slo={slo} />;
  }

  if (selectedTabId === ALERTS_TAB_ID) {
    return <SloDetailsAlerts slo={slo} />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xl">
      <SloRemoteCallout slo={slo} />
      <SloHealthCallout slo={slo} />

      <EuiFlexGroup direction="column" gutterSize="l">
        <BurnRatePanel slo={slo} isAutoRefreshing={isAutoRefreshing} />
        <HistoricalDataCharts slo={slo} isAutoRefreshing={isAutoRefreshing} />
        <EventsChartPanel slo={slo} range={range} />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
