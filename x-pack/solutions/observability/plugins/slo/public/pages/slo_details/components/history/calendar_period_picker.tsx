/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { toDuration } from '../../../../utils/slo/duration';
import { TimeBounds } from '../../types';

interface Props {
  slo: SLOWithSummaryResponse;
  onChange: (range: TimeBounds) => void;
}

export function CalendarPeriodPicker({ slo, onChange }: Props) {
  const [calendarPeriod, setCalendarPeriod] = useState<number>(0);

  useEffect(() => {
    if (slo.timeWindow.type === 'calendarAligned') {
      const now = moment();
      const duration = toDuration(slo.timeWindow.duration);
      const unit = duration.unit === 'w' ? 'isoWeek' : 'month';
      const durationUnit = duration.unit === 'w' ? 'week' : 'month';

      return onChange({
        from: moment.utc(now).subtract(calendarPeriod, durationUnit).startOf(unit).toDate(),
        to: moment.utc(now).subtract(calendarPeriod, durationUnit).endOf(unit).toDate(),
      });
    }
  }, [onChange, calendarPeriod, slo.timeWindow]);

  return (
    <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="center">
      <EuiButton
        size="s"
        data-test-subj="sloSloDetailsHistoryPreviousButton"
        onClick={() => {
          setCalendarPeriod((curr) => curr + 1);
        }}
      >
        {i18n.translate('xpack.slo.sloDetailsHistory.previousPeriodButtonLabel', {
          defaultMessage: 'Previous',
        })}
      </EuiButton>
      <EuiText size="s">
        <p>{getCalendarPeriodLabel(slo, calendarPeriod)}</p>
      </EuiText>
      <EuiButton
        size="s"
        data-test-subj="sloSloDetailsHistoryNextButton"
        disabled={calendarPeriod <= 0}
        onClick={() => {
          setCalendarPeriod((curr) => curr - 1);
        }}
      >
        {i18n.translate('xpack.slo.sloDetailsHistory.nextPeriodButtonLabel', {
          defaultMessage: 'Next',
        })}
      </EuiButton>
    </EuiFlexGroup>
  );
}

function getCalendarPeriodLabel(slo: SLOWithSummaryResponse, calendarPeriod: number): string {
  const duration = toDuration(slo.timeWindow.duration);
  const isWeeklyCalendarAligned = duration.unit === 'w';
  const now = moment().utc();

  const start = now
    .clone()
    .subtract(calendarPeriod, isWeeklyCalendarAligned ? 'week' : 'month')
    .startOf(isWeeklyCalendarAligned ? 'isoWeek' : 'month');
  const end = now
    .clone()
    .subtract(calendarPeriod, isWeeklyCalendarAligned ? 'week' : 'month')
    .endOf(isWeeklyCalendarAligned ? 'isoWeek' : 'month');

  return `${start.format('LL')} - ${end.format('LL')}`;
}
