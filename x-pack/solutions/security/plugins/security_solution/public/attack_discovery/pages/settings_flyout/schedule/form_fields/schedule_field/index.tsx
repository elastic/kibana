/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { TIME_UNITS, getTimeOptions } from './get_time_options';
import { type FieldHook, getFieldValidityAndErrorMessage } from '../../../../../../shared_imports';

const INTEGER_REGEX = /^[1-9][0-9]*$/;
const MIN_TIME_VALUE = 1;
const DEFAULT_TIME_VALUE = 24;
const DEFAULT_TIME_UNIT = TIME_UNITS.HOUR;
const ALL_UNITS = [TIME_UNITS.SECOND, TIME_UNITS.MINUTE, TIME_UNITS.HOUR, TIME_UNITS.DAY];

interface Props {
  field: FieldHook<string>;
}

export const ScheduleField: React.FC<Props> = React.memo(({ field }) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const { setValue: setFieldValue, value: fieldValue } = field;

  const [timeType, setTimeType] = useState<string>(DEFAULT_TIME_UNIT);
  const [timeVal, setTimeVal] = useState<number>(DEFAULT_TIME_VALUE);

  useEffect(() => {
    if (fieldValue === `${timeVal}${timeType}`) {
      return;
    }

    const isNegative = fieldValue.startsWith('-');
    const durationRegexp = new RegExp(`^\\-?(\\d+)(${ALL_UNITS.join('|')})$`);
    const durationMatchArray = fieldValue.match(durationRegexp);

    if (!durationMatchArray) {
      return;
    }

    const [, timeStr, unit] = durationMatchArray;
    const time = parseInt(timeStr, 10) * (isNegative ? -1 : 1);

    setTimeVal(time);
    setTimeType(unit);
  }, [timeType, timeVal, fieldValue]);

  const onIntervalNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (INTEGER_REGEX.test(value)) {
        const parsedValue = Math.max(MIN_TIME_VALUE, parseInt(value, 10));
        setTimeVal(parsedValue);
        setFieldValue(`${parsedValue}${timeType}`);
      }
    },
    [setFieldValue, timeType]
  );

  const onIntervalUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTimeType(e.target.value);
      setFieldValue(`${timeVal}${e.target.value}`);
    },
    [setFieldValue, timeVal]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj="attackDiscoveryScheduleField"
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={2}>
          <EuiFieldNumber
            fullWidth
            value={timeVal}
            name="interval"
            data-test-subj="scheduleNumberInput"
            onChange={onIntervalNumberChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiSelect
            fullWidth
            value={timeType}
            options={getTimeOptions(timeVal ?? 1)}
            onChange={onIntervalUnitChange}
            data-test-subj="scheduleUnitInput"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
});
ScheduleField.displayName = 'ScheduleField';
