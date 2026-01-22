/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiDatePicker } from '@elastic/eui';
import moment from 'moment';
import * as i18n from '../../pages/translations';

export interface DateTimePickerGroupProps {
  startTime: Date;
  endTime: Date;
  onStartChange: (date: Date) => void;
  onEndChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export const DateTimePickerGroup: React.FC<DateTimePickerGroupProps> = React.memo(
  ({ startTime, endTime, onStartChange, onEndChange, minDate, maxDate }) => {
    const handleStartChange = useCallback(
      (date: moment.Moment | null) => {
        if (date && date.isValid()) {
          const newStart = date.toDate();
          if (newStart < endTime) {
            onStartChange(newStart);
          }
        }
      },
      [endTime, onStartChange]
    );

    const handleEndChange = useCallback(
      (date: moment.Moment | null) => {
        if (date && date.isValid()) {
          const newEnd = date.toDate();
          if (newEnd > startTime) {
            onEndChange(newEnd);
          }
        }
      },
      [startTime, onEndChange]
    );

    return (
      <EuiFlexGroup gutterSize="m" alignItems="flexStart">
        <EuiFlexItem>
          <EuiFormRow label={i18n.DRIFT_TIMELINE_START_TIME} fullWidth>
            <EuiDatePicker
              selected={moment(startTime)}
              onChange={handleStartChange}
              showTimeSelect
              timeFormat="HH:mm"
              dateFormat="YYYY-MM-DD HH:mm"
              minDate={minDate ? moment(minDate) : undefined}
              maxDate={moment(endTime)}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={i18n.DRIFT_TIMELINE_END_TIME} fullWidth>
            <EuiDatePicker
              selected={moment(endTime)}
              onChange={handleEndChange}
              showTimeSelect
              timeFormat="HH:mm"
              dateFormat="YYYY-MM-DD HH:mm"
              minDate={moment(startTime)}
              maxDate={maxDate ? moment(maxDate) : undefined}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

DateTimePickerGroup.displayName = 'DateTimePickerGroup';
