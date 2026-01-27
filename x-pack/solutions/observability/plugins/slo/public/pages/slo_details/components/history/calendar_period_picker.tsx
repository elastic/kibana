/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import type { TimeBounds } from '../../types';

interface Props {
  period: 'week' | 'month';
  range: TimeBounds;
  onChange: (range: TimeBounds) => void;
}

export function CalendarPeriodPicker({ period, range, onChange }: Props) {
  const isWeeklyPeriod = period === 'week';
  const durationUnit = isWeeklyPeriod ? 'week' : 'month';
  const unit = isWeeklyPeriod ? 'isoWeek' : 'month';

  function handlePrevious() {
    const start = moment.utc(range.from).subtract(1, durationUnit);
    onChange({
      from: start.startOf(unit).toDate(),
      to: start.endOf(unit).toDate(),
    });
  }

  function handleNext() {
    const start = moment.utc(range.from).add(1, durationUnit);
    onChange({
      from: start.startOf(unit).toDate(),
      to: start.endOf(unit).toDate(),
    });
  }

  function getCalendarPeriodLabel() {
    const start = moment.utc(range.from);
    return `${start.startOf(unit).format('ll')} - ${start.endOf(unit).format('ll')}`;
  }

  return (
    <EuiFlexGroup direction="row" justifyContent="spaceEvenly" alignItems="center">
      <EuiButton
        size="s"
        data-test-subj="sloSloDetailsHistoryPreviousButton"
        onClick={() => handlePrevious()}
        iconType="arrowLeft"
      >
        {i18n.translate('xpack.slo.sloDetailsHistory.previousPeriodButtonLabel', {
          defaultMessage: 'Previous',
        })}
      </EuiButton>
      <EuiText size="s" textAlign="center">
        <p>{getCalendarPeriodLabel()}</p>
      </EuiText>
      <EuiButton
        size="s"
        data-test-subj="sloSloDetailsHistoryNextButton"
        onClick={() => handleNext()}
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
