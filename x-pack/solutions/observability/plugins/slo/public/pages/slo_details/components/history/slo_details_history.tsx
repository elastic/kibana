/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSuperDatePicker,
  EuiTitle,
  OnTimeChangeProps,
} from '@elastic/eui';
import DateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useState } from 'react';
import { ErrorRateChart } from '../../../../components/slo/error_rate_chart';
import { useKibana } from '../../../../hooks/use_kibana';
import { toDuration } from '../../../../utils/slo/duration';
import { TimeBounds } from '../../types';
import { EventsChartPanel } from '../events_chart_panel/events_chart_panel';
import { HistoricalDataCharts } from '../historical_data_charts';
import { CalendarPeriodPicker } from './calendar_period_picker';

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
}

export function SloDetailsHistory({ slo, isAutoRefreshing }: Props) {
  const { uiSettings } = useKibana().services;

  const [range, setRange] = useState<TimeBounds>(() => {
    if (slo.timeWindow.type === 'calendarAligned') {
      const now = moment();
      const duration = toDuration(slo.timeWindow.duration);
      const unit = duration.unit === 'w' ? 'isoWeek' : 'month';

      return {
        from: moment.utc(now).startOf(unit).toDate(),
        to: moment.utc(now).endOf(unit).toDate(),
      };
    }

    return {
      from: new Date(DateMath.parse(`now-${slo.timeWindow.duration}`)!.valueOf()),
      to: new Date(DateMath.parse('now', { roundUp: true })!.valueOf()),
    };
  });

  const onBrushed = ({ from, to }: TimeBounds) => {
    setRange({ from, to });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup justifyContent="flexEnd" direction="row" gutterSize="s">
        <EuiFlexItem grow css={{ maxWidth: 500 }}>
          {slo.timeWindow.type === 'calendarAligned' ? (
            <CalendarPeriodPicker
              slo={slo}
              onChange={(updatedRange: TimeBounds) => {
                setRange(updatedRange);
              }}
            />
          ) : (
            <EuiSuperDatePicker
              isLoading={false}
              start={range.from.toISOString()}
              end={range.to.toISOString()}
              onTimeChange={(val: OnTimeChangeProps) => {
                setRange({
                  from: new Date(DateMath.parse(val.start)!.valueOf()),
                  to: new Date(DateMath.parse(val.end, { roundUp: true })!.valueOf()),
                });
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
            dataTimeRange={range}
            onBrushed={onBrushed}
            variant={['VIOLATED', 'DEGRADING'].includes(slo.summary.status) ? 'danger' : 'success'}
          />
        </EuiFlexGroup>
      </EuiPanel>

      <HistoricalDataCharts
        slo={slo}
        hideMetadata={true}
        isAutoRefreshing={isAutoRefreshing}
        range={range}
        onBrushed={onBrushed}
      />

      <EventsChartPanel slo={slo} range={range} hideRangeDurationLabel onBrushed={onBrushed} />
    </EuiFlexGroup>
  );
}
