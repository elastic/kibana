/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useState } from 'react';
import { toDuration } from '../../../../utils/slo/duration';
import type { TimeBounds } from '../../types';

interface Props {
  slo: SLOWithSummaryResponse;
  onChange: (range: TimeBounds) => void;
}

export function CalendarPeriodPicker({ slo, onChange }: Props) {
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  function handleChangePeriod(offset: number) {
    const now = moment();
    const duration = toDuration(slo.timeWindow.duration);
    const unit = duration.unit === 'w' ? 'isoWeek' : 'month';
    const durationUnit = duration.unit === 'w' ? 'week' : 'month';

    setPeriodOffset((curr) => {
      const newOffset = curr + offset;

      onChange({
        from: moment.utc(now).subtract(newOffset, durationUnit).startOf(unit).toDate(),
        to: moment.utc(now).subtract(newOffset, durationUnit).endOf(unit).toDate(),
      });

      return newOffset;
    });
  }

  return (
    <EuiFlexGroup direction="row" justifyContent="spaceEvenly" alignItems="center">
      <EuiButton
        size="s"
        data-test-subj="sloSloDetailsHistoryPreviousButton"
        onClick={() => {
          handleChangePeriod(+1);
        }}
        iconType="arrowLeft"
      >
        {i18n.translate('xpack.slo.sloDetailsHistory.previousPeriodButtonLabel', {
          defaultMessage: 'Previous',
        })}
      </EuiButton>
      <EuiText size="s" textAlign="center">
        <p>{getCalendarPeriodLabel(slo, periodOffset)}</p>
      </EuiText>
      <EuiButton
        size="s"
        data-test-subj="sloSloDetailsHistoryNextButton"
        disabled={periodOffset <= 0}
        onClick={() => {
          handleChangePeriod(-1);
        }}
        iconType="arrowRight"
        iconSide="right"
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

  return `${start.format('ll')} - ${end.format('ll')}`;
}
