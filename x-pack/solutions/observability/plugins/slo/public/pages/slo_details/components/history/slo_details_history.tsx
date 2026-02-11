/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OnTimeChangeProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSuperDatePicker, EuiTitle } from '@elastic/eui';
import DateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useUrlAppState } from './hooks/use_url_app_state';
import { ErrorRateChart } from '../../../../components/slo/error_rate_chart';
import { useKibana } from '../../../../hooks/use_kibana';
import { toDuration } from '../../../../utils/slo/duration';
import type { TimeBounds } from '../../types';
import { EventsChartPanel } from '../events_chart_panel/events_chart_panel';
import { HistoricalDataCharts } from '../historical_data_charts';
import { CalendarPeriodPicker } from './calendar_period_picker';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloDetailsHistory({ slo }: Props) {
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

      <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="errorRatePanel">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.slo.sloDetailsHistory.h2.errorRatePanelTitle', {
                  defaultMessage: 'Error rate',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <ErrorRateChart
            slo={slo}
            dataTimeRange={state.range}
            onBrushed={onBrushed}
            variant={['VIOLATED', 'DEGRADING'].includes(slo.summary.status) ? 'danger' : 'success'}
          />
        </EuiFlexGroup>
      </EuiPanel>

      <HistoricalDataCharts
        slo={slo}
        isAutoRefreshing={false}
        range={state.range}
        onBrushed={onBrushed}
        hideHeaderDurationLabel={true}
      />

      <EventsChartPanel
        slo={slo}
        range={state.range}
        hideRangeDurationLabel
        onBrushed={onBrushed}
      />
    </EuiFlexGroup>
  );
}
