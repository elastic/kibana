/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { WORKER_SCHEDULE_UNITS, type WorkerScheduleUnit } from '@kbn/alertzero-common';
import * as i18n from '../settings_translations';

interface ScheduleIntervalFieldProps {
  current: string;
  isDisabled?: boolean;
  onChange: (scheduleInterval: string) => void;
}

interface ParsedInterval {
  value: number;
  unit: WorkerScheduleUnit;
}

const DEFAULT_PARSED_INTERVAL: ParsedInterval = { value: 24, unit: 'h' };
const INTERVAL_PATTERN = /^([1-9][0-9]*)([mhd])$/;

const parseInterval = (interval: string): ParsedInterval | undefined => {
  const match = INTERVAL_PATTERN.exec(interval);
  return match ? { value: Number(match[1]), unit: match[2] as WorkerScheduleUnit } : undefined;
};

/** Number + unit interval control, controlled by `current`; every valid change updates the page draft immediately. */
export const ScheduleIntervalField: React.FC<ScheduleIntervalFieldProps> = ({
  current,
  isDisabled,
  onChange,
}) => {
  const { value, unit } = parseInterval(current) ?? DEFAULT_PARSED_INTERVAL;

  const commit = useCallback(
    (next: ParsedInterval) => {
      const interval = `${next.value}${next.unit}`;
      if (interval !== current) {
        onChange(interval);
      }
    },
    [current, onChange]
  );

  const onValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value.trim();
      if (!/^[1-9][0-9]*$/.test(raw)) {
        return;
      }
      commit({ value: Number(raw), unit });
    },
    [commit, unit]
  );

  const onUnitChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      commit({ value, unit: event.target.value as WorkerScheduleUnit });
    },
    [commit, value]
  );

  const unitOptions = useMemo(
    () =>
      WORKER_SCHEDULE_UNITS.map((option) => ({
        value: option,
        text: i18n.scheduleUnitLabel(option, value),
      })),
    [value]
  );

  return (
    <EuiFormRow
      label={i18n.SCHEDULE_INTERVAL_LABEL}
      helpText={i18n.SCHEDULE_INTERVAL_HELP_TEXT}
      fullWidth
      data-test-subj="alertZeroScheduleIntervalField"
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={2}>
          <EuiFieldNumber
            fullWidth
            min={1}
            value={value}
            disabled={isDisabled}
            onChange={onValueChange}
            aria-label={i18n.SCHEDULE_INTERVAL_NUMBER_ARIA_LABEL}
            data-test-subj="alertZeroScheduleIntervalValue"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiSelect
            fullWidth
            value={unit}
            options={unitOptions}
            disabled={isDisabled}
            onChange={onUnitChange}
            aria-label={i18n.SCHEDULE_INTERVAL_UNIT_ARIA_LABEL}
            data-test-subj="alertZeroScheduleIntervalUnit"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
