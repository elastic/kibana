/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSuperDatePicker,
  EuiText,
  EuiTitle,
  OnTimeChangeProps,
} from '@elastic/eui';
import DateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { ErrorRateChart } from '../../../../components/slo/error_rate_chart';
import { useKibana } from '../../../../hooks/use_kibana';
import { toDuration } from '../../../../utils/slo/duration';
import { TimeBounds } from '../../types';
import { EventsChartPanel } from '../events_chart_panel/events_chart_panel';
import { HistoricalDataCharts } from '../historical_data_charts';

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
}

function getPeriodLabel(slo: SLOWithSummaryResponse, calendarPeriod: number): string {
  const duration = toDuration(slo.timeWindow.duration);
  const unit = duration.unit === 'w' ? 'week' : 'month';
  const now = moment();
  const start = moment
    .utc(now)
    .subtract(calendarPeriod, unit)
    .startOf(duration.unit === 'w' ? 'isoWeek' : 'month');
  const end = moment
    .utc(now)
    .subtract(calendarPeriod, unit)
    .endOf(duration.unit === 'w' ? 'isoWeek' : 'month');
  return `${start.format('LL')} - ${end.format('LL')}`;
}

export function SloDetailsHistory({ slo, isAutoRefreshing }: Props) {
  const { uiSettings } = useKibana().services;
  const [calendarPeriod, setCalendarPeriod] = useState<number>(0);

  // TODO: refactor
  const [range, setRange] = useState<TimeBounds>(() => {
    if (slo.timeWindow.type === 'calendarAligned') {
      const now = moment();
      const duration = toDuration(slo.timeWindow.duration);
      const unit = duration.unit === 'w' ? 'isoWeek' : 'months';

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

  useEffect(() => {
    if (slo.timeWindow.type === 'calendarAligned') {
      const now = moment();
      const duration = toDuration(slo.timeWindow.duration);
      const unit = duration.unit === 'w' ? 'isoWeek' : 'month';
      const durationUnit = duration.unit === 'w' ? 'week' : 'month';

      return setRange({
        from: moment.utc(now).subtract(calendarPeriod, durationUnit).startOf(unit).toDate(),
        to: moment.utc(now).subtract(calendarPeriod, durationUnit).endOf(unit).toDate(),
      });
    }
  }, [calendarPeriod, slo.timeWindow]);

  const onBrushed = ({ from, to }: TimeBounds) => {
    setRange({ from, to });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup justifyContent="flexEnd" direction="row" gutterSize="s">
        <EuiFlexItem grow css={{ maxWidth: 500 }}>
          {slo.timeWindow.type === 'calendarAligned' ? (
            <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="center">
              <EuiButton
                onClick={() => {
                  setCalendarPeriod((curr) => curr + 1);
                }}
              >
                Previous
              </EuiButton>
              <EuiText size="s">
                <p>{getPeriodLabel(slo, calendarPeriod)}</p>
              </EuiText>
              <EuiButton
                disabled={calendarPeriod <= 0}
                onClick={() => {
                  setCalendarPeriod((curr) => curr - 1);
                }}
              >
                Next
              </EuiButton>
            </EuiFlexGroup>
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
