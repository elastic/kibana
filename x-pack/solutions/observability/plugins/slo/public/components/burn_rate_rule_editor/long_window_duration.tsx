/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, useState } from 'react';
import { Duration } from '../../typings';

interface Props {
  initialDuration?: Duration;
  errors?: string[];
  onChange: (duration: Duration) => void;
}

export function LongWindowDuration({ initialDuration, onChange, errors }: Props) {
  const [durationValue, setDurationValue] = useState<number>(initialDuration?.value ?? 1);
  const hasError = errors !== undefined && errors.length > 0;

  const onDurationValueChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setDurationValue(value);
    onChange({ value, unit: 'h' });
  };

  return (
    <EuiFormRow label={getRowLabel()} fullWidth isInvalid={hasError}>
      <EuiFieldNumber
        isInvalid={hasError}
        min={1}
        max={72}
        step={1}
        value={String(durationValue)}
        onChange={onDurationValueChange}
        aria-label={i18n.translate('xpack.slo.rules.longWindow.valueLabel', {
          defaultMessage: 'Long lookback period in hours',
        })}
        data-test-subj="durationValueInput"
      />
    </EuiFormRow>
  );
}

const getRowLabel = () => (
  <>
    {i18n.translate('xpack.slo.rules.longWindow.rowLabel', {
      defaultMessage: 'Long lookback (hours)',
    })}{' '}
    <EuiIconTip
      position="top"
      content={i18n.translate('xpack.slo.rules.longWindowDuration.tooltip', {
        defaultMessage: 'Long lookback period over which the burn rate is computed.',
      })}
    />
  </>
);
