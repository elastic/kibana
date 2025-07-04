/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiFieldNumber, EuiFormRow, EuiSelect, useEuiTheme } from '@elastic/eui';
import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import * as I18n from './translations';

interface DurationInputProps {
  durationValueField: FieldHook<number | undefined>;
  durationUnitField: FieldHook<string>;
  minimumValue?: number;
  isDisabled: boolean;
  durationUnitOptions?: Array<{ value: 's' | 'm' | 'h' | 'd'; text: string }>;
  'aria-label'?: string;
}

// This component is similar to the ScheduleItem component, but instead of combining the value
// and unit into a single string it keeps them separate. This makes the component simpler and
// allows for easier validation of values and units in APIs as well.
export const DurationInput = memo(function DurationInputComponent({
  durationValueField,
  durationUnitField,
  minimumValue = 0,
  isDisabled,
  durationUnitOptions = [
    { value: 's', text: I18n.SECONDS },
    { value: 'm', text: I18n.MINUTES },
    { value: 'h', text: I18n.HOURS },
  ],
  'aria-label': ariaLabel,
  ...props
}: DurationInputProps): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(durationValueField);
  const { value: durationValue, setValue: setDurationValue } = durationValueField;
  const { value: durationUnit, setValue: setDurationUnit } = durationUnitField;

  const onChangeTimeType: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => {
      setDurationUnit(e.target.value);
    },
    [setDurationUnit]
  );

  const onChangeTimeVal: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const sanitizedValue = getNumberFromUserInput(e.target.value, minimumValue);
      setDurationValue(sanitizedValue);
    },
    [minimumValue, setDurationValue]
  );

  const durationFormRowStyle = css`
    max-width: 235px;

    .euiFormControlLayout__append {
      padding-inline: 0 !important;
    }

    .euiFormControlLayoutIcons {
      color: ${euiTheme.colors.primary};
    }
  `;
  const durationUnitSelectStyle = css`
    min-width: 106px; // Preserve layout when disabled & dropdown arrow is not rendered
    box-shadow: none !important; // Override disabled state
    background: ${euiTheme.colors.backgroundBasePrimary} !important;
    color: ${euiTheme.colors.primary};

    &:disabled {
      border-left: ${euiTheme.border.thin};
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }
  `;
  const durationInputStyle = css`
    box-shadow: none !important; // Override disabled state
  `;

  // EUI missing some props
  const rest = { disabled: isDisabled, ...props };

  return (
    <EuiFormRow
      css={durationFormRowStyle}
      error={errorMessage}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
    >
      <EuiFieldNumber
        css={durationInputStyle}
        append={
          <EuiSelect
            css={durationUnitSelectStyle}
            options={durationUnitOptions}
            onChange={onChangeTimeType}
            value={durationUnit}
            aria-label={I18n.DURATION_UNIT_SELECTOR}
            data-test-subj="timeType"
            {...rest}
          />
        }
        min={minimumValue}
        max={Number.MAX_SAFE_INTEGER}
        onChange={onChangeTimeVal}
        value={durationValue}
        data-test-subj="interval"
        aria-label={ariaLabel}
        {...rest}
      />
    </EuiFormRow>
  );
});

function getNumberFromUserInput(input: string, minimumValue = 0): number | undefined {
  const number = parseInt(input, 10);

  if (Number.isNaN(number)) {
    return minimumValue;
  } else {
    return Math.max(minimumValue, Math.min(number, Number.MAX_SAFE_INTEGER));
  }
}
