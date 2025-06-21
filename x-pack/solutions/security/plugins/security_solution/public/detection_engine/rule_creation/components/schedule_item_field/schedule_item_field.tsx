/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiSelectProps, EuiFieldNumberProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiFormRow,
  EuiSelect,
  transparentize,
} from '@elastic/eui';
import styled from 'styled-components';

import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';

import * as I18n from './translations';

interface ScheduleItemProps {
  field: FieldHook<string>;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  minValue?: number;
  maxValue?: number;
  units?: string[];
  fullWidth?: boolean;
}

const timeTypeOptions = [
  { value: 's', text: I18n.SECONDS },
  { value: 'm', text: I18n.MINUTES },
  { value: 'h', text: I18n.HOURS },
  { value: 'd', text: I18n.DAYS },
];

// move optional label to the end of input
const StyledLabelAppend = styled(EuiFlexItem)`
  &.euiFlexItem {
    margin-left: 31px;
  }
`;

const StyledEuiFormRow = styled(EuiFormRow)`
  max-width: none;

  .euiFormControlLayout__append {
    padding-inline: 0 !important;
  }

  .euiFormControlLayoutIcons {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;

const MyEuiSelect = styled(EuiSelect)`
  min-width: 106px; // Preserve layout when disabled & dropdown arrow is not rendered
  background: ${({ theme }) =>
    transparentize(theme.eui.euiColorPrimary, 0.1)} !important; // Override focus states etc.
  color: ${({ theme }) => theme.eui.euiColorPrimary};
  box-shadow: none;
`;

export function ScheduleItemField({
  field,
  isDisabled,
  dataTestSubj,
  idAria,
  minValue = Number.MIN_SAFE_INTEGER,
  maxValue = Number.MAX_SAFE_INTEGER,
  units = DEFAULT_TIME_DURATION_UNITS,
  fullWidth = false,
}: ScheduleItemProps): JSX.Element {
  const [timeType, setTimeType] = useState(units[0]);
  const [timeVal, setTimeVal] = useState<number>(0);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { value, setValue } = field;

  const onChangeTimeType = useCallback<NonNullable<EuiSelectProps['onChange']>>(
    (e) => {
      setTimeType(e.target.value);
      setValue(`${timeVal}${e.target.value}`);
    },
    [setValue, timeVal]
  );

  const onChangeTimeVal = useCallback<NonNullable<EuiFieldNumberProps['onChange']>>(
    (e) => {
      const number = e.target.value === '' ? minValue : parseInt(e.target.value, 10);

      if (Number.isNaN(number)) {
        return;
      }

      const newTimeValue = saturate(number, minValue, maxValue);

      setTimeVal(newTimeValue);
      setValue(`${newTimeValue}${timeType}`);
    },
    [minValue, maxValue, setValue, timeType]
  );

  useEffect(() => {
    if (value === `${timeVal}${timeType}`) {
      return;
    }

    const isNegative = value.startsWith('-');
    const durationRegexp = new RegExp(`^\\-?(\\d+)(${units.join('|')})$`);
    const durationMatchArray = value.match(durationRegexp);

    if (!durationMatchArray) {
      return;
    }

    const [, timeStr, unit] = durationMatchArray;
    const time = parseInt(timeStr, 10) * (isNegative ? -1 : 1);

    setTimeVal(time);
    setTimeType(unit);
  }, [timeType, units, timeVal, value]);

  const label = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false} component="span">
          {field.label}
        </EuiFlexItem>
        <StyledLabelAppend grow={false} component="span">
          {field.labelAppend}
        </StyledLabelAppend>
      </EuiFlexGroup>
    ),
    [field.label, field.labelAppend]
  );

  return (
    <StyledEuiFormRow
      label={label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth={fullWidth}
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <EuiFieldNumber
        append={
          <MyEuiSelect
            fullWidth
            options={timeTypeOptions.filter((type) => units.includes(type.value))}
            value={timeType}
            onChange={onChangeTimeType}
            disabled={isDisabled}
            aria-label={field.label}
            data-test-subj="timeType"
          />
        }
        fullWidth
        min={minValue}
        max={maxValue}
        value={timeVal}
        onChange={onChangeTimeVal}
        disabled={isDisabled}
        data-test-subj="interval"
      />
    </StyledEuiFormRow>
  );
}

const DEFAULT_TIME_DURATION_UNITS = ['s', 'm', 'h', 'd'];

function saturate(input: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(input, maxValue));
}
