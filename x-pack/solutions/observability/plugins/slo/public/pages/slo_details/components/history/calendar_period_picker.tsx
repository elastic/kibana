/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import type { TimeBounds } from '../../types';

interface Props {
  period: 'week' | 'month';
  range: TimeBounds;
  onChange: (range: TimeBounds) => void;
  onReset?: () => void;
  isResetDisabled?: boolean;
}

export function CalendarPeriodPicker({
  period,
  range,
  onChange,
  onReset,
  isResetDisabled = true,
}: Props) {
  const { euiTheme } = useEuiTheme();
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
    <EuiFlexGroup
      direction="row"
      justifyContent="spaceBetween"
      alignItems="center"
      responsive={false}
      wrap={false}
      gutterSize="s"
      css={{ paddingRight: euiTheme.size.s }}
    >
      <EuiButton
        size="s"
        data-test-subj="sloSloDetailsHistoryPreviousButton"
        onClick={() => handlePrevious()}
        iconType="chevronSingleLeft"
      >
        {i18n.translate('xpack.slo.sloDetailsHistory.previousPeriodButtonLabel', {
          defaultMessage: 'Previous',
        })}
      </EuiButton>

      <EuiText size="s" textAlign="center" css={{ whiteSpace: 'nowrap' }}>
        <p>{getCalendarPeriodLabel()}</p>
      </EuiText>

      <EuiFlexGroup
        direction="row"
        alignItems="center"
        responsive={false}
        wrap={false}
        gutterSize="xs"
      >
        <EuiButton
          size="s"
          data-test-subj="sloSloDetailsHistoryNextButton"
          onClick={() => handleNext()}
          iconType="chevronSingleRight"
          iconSide="right"
        >
          {i18n.translate('xpack.slo.sloDetailsHistory.nextPeriodButtonLabel', {
            defaultMessage: 'Next',
          })}
        </EuiButton>
        {onReset ? (
          <EuiButtonEmpty
            size="s"
            data-test-subj="sloSloDetailsHistoryResetButton"
            iconType="refresh"
            onClick={onReset}
            isDisabled={isResetDisabled}
          >
            {i18n.translate('xpack.slo.sloDetailsHistory.resetPeriodButtonLabel', {
              defaultMessage: 'Reset',
            })}
          </EuiButtonEmpty>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
