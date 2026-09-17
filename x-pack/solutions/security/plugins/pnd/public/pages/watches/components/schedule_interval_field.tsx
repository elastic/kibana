/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { WORKER_SCHEDULE_UNITS, type WorkerScheduleUnit } from '@kbn/pnd-common';
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
 * EuiFieldNumber fires onChange per keystroke, so the value is persisted on blur (and immediately
 * on a unit change) — otherwise typing "30" would save "3h" and then "30h", rewriting the workflow
 * and re-registering its Task Manager schedule twice.
 */
export const ScheduleIntervalField: React.FC<ScheduleIntervalFieldProps> = ({
  current,
  isDisabled,
  onChange,
}) => {
  const parsedCurrent = parseInterval(current) ?? DEFAULT_PARSED_INTERVAL;
  const [draft, setDraft] = useState<ParsedInterval>(parsedCurrent);
  const draftRef = useRef<ParsedInterval>(parsedCurrent);
  const lastPersistedRef = useRef(current);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  // Re-sync when the server echoes a different value than the one typed — the mutation is
  // optimistic and rolls back on a settings conflict.
  useEffect(() => {
    lastPersistedRef.current = current;
    const next = parseInterval(current);
    if (!next) {
      return;
    }
    draftRef.current = next;
    setDraft(next);
  }, [current]);

  const persist = useCallback(({ value, unit }: ParsedInterval) => {
    const interval = `${value}${unit}`;
    if (interval === lastPersistedRef.current) {
      return;
    }
    lastPersistedRef.current = interval;
    onChangeRef.current(interval);
  }, []);

  const onValueChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.trim();
    if (!/^[1-9][0-9]*$/.test(raw)) {
      return;
    }
    const next = { ...draftRef.current, value: Number(raw) };
    draftRef.current = next;
    setDraft(next);
  }, []);

  const onUnitChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const unit = event.target.value as WorkerScheduleUnit;
      const next = { ...draftRef.current, unit };
      draftRef.current = next;
      setDraft(next);
      persist(next);
    },
    [persist]
  );

  const onValueBlur = useCallback(() => {
    persist(draftRef.current);
  }, [persist]);

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
      data-test-subj="pndScheduleIntervalField"
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
            data-test-subj="pndScheduleIntervalValue"
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
            data-test-subj="pndScheduleIntervalUnit"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
