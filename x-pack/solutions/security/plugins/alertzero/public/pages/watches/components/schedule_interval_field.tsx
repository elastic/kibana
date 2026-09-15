/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

/**
 * Interval control for a schedule-driven Worker, mirroring the Attack Discovery schedule form's
 * number + unit pairing.
 *
 * The number half is buffered locally and committed to the page draft on blur (the unit commits
 * immediately with the buffered number), so an intermediate "3" on the way to "30" never reaches
 * the draft. The buffer follows `current`, which is what resets the field on Discard or refresh.
 */
export const ScheduleIntervalField: React.FC<ScheduleIntervalFieldProps> = ({
  current,
  isDisabled,
  onChange,
}) => {
  const [draft, setDraft] = useState<ParsedInterval>(
    () => parseInterval(current) ?? DEFAULT_PARSED_INTERVAL
  );

  useEffect(() => {
    const next = parseInterval(current);
    if (next) {
      setDraft(next);
    }
  }, [current]);

  const commit = useCallback(
    ({ value, unit }: ParsedInterval) => {
      const interval = `${value}${unit}`;
      if (interval !== current) {
        onChange(interval);
      }
    },
    [current, onChange]
  );

  const onValueChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.trim();
    // Anything but a positive integer is rejected outright rather than buffered.
    if (!/^[1-9][0-9]*$/.test(raw)) {
      return;
    }
    setDraft((previous) => ({ ...previous, value: Number(raw) }));
  }, []);

  const onUnitChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const next = { ...draft, unit: event.target.value as WorkerScheduleUnit };
      setDraft(next);
      commit(next);
    },
    [commit, draft]
  );

  const onValueBlur = useCallback(() => {
    commit(draft);
  }, [commit, draft]);

  const unitOptions = useMemo(
    () =>
      WORKER_SCHEDULE_UNITS.map((unit) => ({
        value: unit,
        text: i18n.scheduleUnitLabel(unit, draft.value),
      })),
    [draft.value]
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
            value={draft.value}
            disabled={isDisabled}
            onChange={onValueChange}
            onBlur={onValueBlur}
            aria-label={i18n.SCHEDULE_INTERVAL_NUMBER_ARIA_LABEL}
            data-test-subj="alertZeroScheduleIntervalValue"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <EuiSelect
            fullWidth
            value={draft.unit}
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
