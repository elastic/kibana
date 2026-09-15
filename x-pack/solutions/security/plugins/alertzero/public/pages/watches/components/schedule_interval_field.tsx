/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WORKER_SCHEDULE_UNITS,
  type WorkerScheduleUnit,
} from '@kbn/alertzero-common';
import { ATTACK_DISCOVERY_CAUTION_BELOW_MINUTES } from './schedule_presets_data';
import {
  formatScheduleRunsHelper,
  scheduleIntervalToMinutes,
  schedulePresetsForWorker,
  type SchedulePreset,
} from './schedule_presets_data';
import { TriggerDayStrip } from './trigger_day_strip';
import * as i18n from '../settings_translations';

interface ScheduleIntervalFieldProps {
  workerId: string;
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

const intervalToString = ({ value, unit }: ParsedInterval): string => `${value}${unit}`;

const presetMatches = (preset: SchedulePreset, parsed: ParsedInterval): boolean =>
  preset.amount === parsed.value && preset.unit === parsed.unit;

/**
 * Interval control for a schedule-driven Worker, mirroring the Attack Discovery
 * schedule form's number + unit pairing, plus the Sep 11 prototype additions:
 * per-Worker cadence presets, a 24h run-tick day strip, a dynamic runs-per-day
 * helper, and a frequent-run caution below 15 minutes for Attack Discovery.
 *
 * EuiFieldNumber fires onChange per keystroke, so the value is persisted on
 * blur (and immediately on a unit or preset change) — otherwise typing "30"
 * would save "3h" and then "30h", rewriting the workflow and re-registering
 * its Task Manager schedule twice.
 */
export const ScheduleIntervalField: React.FC<ScheduleIntervalFieldProps> = ({
  workerId,
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
    const interval = intervalToString({ value, unit });
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

  const presets = useMemo(() => schedulePresetsForWorker(workerId), [workerId]);

  const presetOptions = useMemo(() => {
    if (!presets) return undefined;
    return presets.map((preset, index) => ({
      id: `${workerId}-preset-${index}`,
      label: preset.label,
    }));
  }, [presets, workerId]);

  const selectedPresetId = useMemo(() => {
    if (!presets || !presetOptions) return '';
    const match = presets.findIndex((preset) => presetMatches(preset, draft));
    return match >= 0 ? presetOptions[match].id : '';
  }, [presets, presetOptions, draft]);

  const onPresetChange = useCallback(
    (optionId: string) => {
      if (!presets || !presetOptions) return;
      const index = presetOptions.findIndex((option) => option.id === optionId);
      const preset = index >= 0 ? presets[index] : undefined;
      if (!preset) return;
      const next: ParsedInterval = { value: preset.amount, unit: preset.unit };
      draftRef.current = next;
      setDraft(next);
      persist(next);
    },
    [presets, presetOptions, persist]
  );

  const intervalMinutes = useMemo(
    () => scheduleIntervalToMinutes(draft.value, draft.unit),
    [draft]
  );

  // Attack Discovery only: frequent-run caution below 15 minutes.
  const showCaution = workerId === SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;

  const runsHelper = useMemo(() => {
    const runsPerDay = 1440 / Math.max(intervalMinutes, 1);
    return formatScheduleRunsHelper({
      runsPerDay,
      cautionBelowMinutes: showCaution ? ATTACK_DISCOVERY_CAUTION_BELOW_MINUTES : undefined,
      intervalMinutes,
    });
  }, [intervalMinutes, showCaution]);

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
      helpText={<span data-test-subj="alertZeroScheduleRunsHelper">{runsHelper}</span>}
      fullWidth
      data-test-subj="alertZeroScheduleIntervalField"
    >
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
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
        {presetOptions ? (
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.SCHEDULE_PRESETS_LEGEND}
              type="single"
              buttonSize="compressed"
              options={presetOptions}
              idSelected={selectedPresetId}
              onChange={onPresetChange}
              isDisabled={isDisabled}
              data-test-subj="alertZeroSchedulePresets"
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <TriggerDayStrip intervalMinutes={intervalMinutes} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
