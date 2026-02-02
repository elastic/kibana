/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OnTimeChangeProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker } from '@elastic/eui';
import DateMath from '@kbn/datemath';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useUrlAppState } from './hooks/use_url_app_state';
import { useKibana } from '../../../../hooks/use_kibana';
import { toDuration } from '../../../../utils/slo/duration';
import type { TimeBounds } from '../../types';
import { HistoricalDataCharts } from '../historical_data_charts/historical_data_charts';
import { CalendarPeriodPicker } from './calendar_period_picker';
import { ErrorRatePanel } from '../error_rate_panel';
import { EventsChartPanel } from '../events_chart_panel';

export interface Props {
  slo: SLOWithSummaryResponse;
  isFlyout?: boolean;
}

export function SloDetailsHistory({ slo, isFlyout }: Props) {
  const { uiSettings } = useKibana().services;

  const { state, updateState } = useUrlAppState(slo);

  const onBrushed = ({ from, to }: TimeBounds) => {
    updateState({ range: { from, to } });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup justifyContent="flexEnd" direction="row" gutterSize="s">
        <EuiFlexItem grow css={{ maxWidth: 500 }}>
          {slo.timeWindow.type === 'calendarAligned' ? (
            <CalendarPeriodPicker
              period={toDuration(slo.timeWindow.duration).unit === 'w' ? 'week' : 'month'}
              range={state.range}
              onChange={(updatedRange: TimeBounds) => {
                updateState({ range: updatedRange });
              }}
            />
          ) : (
            <EuiSuperDatePicker
              isLoading={false}
              start={state.range.from.toISOString()}
              end={state.range.to.toISOString()}
              onTimeChange={(val: OnTimeChangeProps) => {
                const newRange = {
                  from: new Date(DateMath.parse(val.start)!.valueOf()),
                  to: new Date(DateMath.parse(val.end, { roundUp: true })!.valueOf()),
                };
                updateState({ range: newRange });
              }}
              width="full"
              showUpdateButton={false}
              commonlyUsedRanges={uiSettings
                .get('timepicker:quickRanges')
                .map(({ from, to, display }: { from: string; to: string; display: string }) => ({
                  start: from,
                  end: to,
                  label: display,
                }))}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <ErrorRatePanel
        slo={slo}
        dataTimeRange={state.range}
        onBrushed={onBrushed}
        isFlyout={isFlyout}
      />

      <HistoricalDataCharts
        slo={slo}
        isAutoRefreshing={false}
        range={state.range}
        onBrushed={onBrushed}
        hideHeaderDurationLabel={true}
        isFlyout={isFlyout}
      />

      <EventsChartPanel
        slo={slo}
        range={state.range}
        hideRangeDurationLabel
        onBrushed={onBrushed}
        isFlyout={isFlyout}
      />
    </EuiFlexGroup>
  );
}
