/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiText } from '@elastic/eui';
import * as i18n from '../settings_translations';

/** Pluralized against the visible amount so the select agrees with the header band's badge. */
const unitOptionsFor = (amount: number) => [
  { value: 'm' as const, text: i18n.scheduleUnitMinutes(amount) },
  { value: 'h' as const, text: i18n.scheduleUnitHours(amount) },
  { value: 'd' as const, text: i18n.scheduleUnitDays(amount) },
];

type ScheduleUnit = ReturnType<typeof unitOptionsFor>[number]['value'];

const parseInterval = (interval: string | undefined): { amount: number; unit: ScheduleUnit } => {
  const match = /^(\d+)([mhd])$/.exec(interval ?? '');
  if (!match) return { amount: 1, unit: 'h' };
  return { amount: Number(match[1]), unit: match[2] as ScheduleUnit };
};

const formatInterval = (amount: number, unit: ScheduleUnit): string => `${amount}${unit}`;

/** `WorkerScheduleInterval` caps the stored string at 6 chars, so the amount is at most 5 digits. */
const MAX_SCHEDULE_AMOUNT = 99999;

const isCommittableAmount = (amount: number): boolean =>
  Number.isInteger(amount) && amount >= 1 && amount <= MAX_SCHEDULE_AMOUNT;

interface ScheduleIntervalFieldProps {
  workerId: string;
  current: string;
  isDisabled?: boolean;
  onChange: (interval: string) => void;
  /**
   * Reports an uncommittable amount. The draft never reaches settings state, so without this Save
   * would persist the last valid cadence while an invalid field is on screen.
   */
  onValidityChange?: (isValid: boolean) => void;
  /**
   * Changes when the page discards its draft. An invalid amount survives blur, so Discard must
   * clear it or the flagged value keeps Save blocked.
   */
  resetKey?: number;
}

/**
 * "Every N unit" trigger row. Commits on change; an amount that is not a whole number of units
 * stays on screen flagged instead of being floored into a different cadence.
 */
export const ScheduleIntervalField: React.FC<ScheduleIntervalFieldProps> = ({
  workerId,
  current,
  isDisabled,
  onChange,
  onValidityChange,
  resetKey,
}) => {
  const { amount, unit } = useMemo(() => parseInterval(current), [current]);
  const [amountDraft, setAmountDraft] = useState<string | null>(null);

  const commit = useCallback(
    (nextAmount: number, nextUnit: ScheduleUnit, rawDraft?: string) => {
      // Flooring 1.9 or 0 would silently save a different cadence; keep it flagged instead.
      if (!isCommittableAmount(nextAmount)) {
        setAmountDraft(rawDraft ?? String(nextAmount));
        return;
      }
      setAmountDraft(null);
      onChange(formatInterval(nextAmount, nextUnit));
    },
    [onChange]
  );

  const amountValue = amountDraft ?? String(amount);
  const amountInvalid = amountDraft != null && !isCommittableAmount(Number(amountDraft));

  useEffect(() => {
    onValidityChange?.(!amountInvalid);
  }, [amountInvalid, onValidityChange]);

  // Discard clears the flagged draft; skipped on mount so it does not fight the initial value.
  const isFirstResetRef = useRef(true);
  useEffect(() => {
    if (isFirstResetRef.current) {
      isFirstResetRef.current = false;
      return;
    }
    setAmountDraft(null);
  }, [resetKey]);

  // Report the control valid again if it unmounts while flagged (e.g. the Worker's trigger row
  // stops rendering), so a removed control cannot leave the page's Save permanently blocked.
  // Held in a ref so this runs on real unmount only, not whenever the parent passes a new callback.
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;
  useEffect(() => () => onValidityChangeRef.current?.(true), []);

  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      alignItems="center"
      wrap
      data-test-subj={`alertZeroTriggerField-${workerId}`}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" aria-hidden="true">
          <span>{i18n.TRIGGER_EVERY}</span>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          width: 88px;
          flex: 0 0 88px;
        `}
      >
        <EuiFieldNumber
          value={amountValue}
          compressed
          fullWidth
          min={1}
          step={1}
          isInvalid={amountInvalid}
          disabled={isDisabled}
          aria-label={i18n.TRIGGER_AMOUNT_ARIA_LABEL}
          data-test-subj={`alertZeroTriggerAmount-${workerId}`}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') {
              setAmountDraft('');
              return;
            }
            const next = Number(raw);
            if (Number.isFinite(next)) {
              commit(next, unit, raw);
            }
          }}
          onBlur={() => {
            // Only drop the draft once it is committable. Clearing an invalid draft here would
            // snap the field back to the persisted cadence and hide the problem, which is how an
            // invalid entry used to slip past Save.
            if (!amountInvalid) {
              setAmountDraft(null);
            }
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          width: 120px;
          flex: 0 0 120px;
        `}
      >
        <EuiSelect
          options={unitOptionsFor(Number(amountValue))}
          value={unit}
          compressed
          fullWidth
          disabled={isDisabled}
          aria-label={i18n.TRIGGER_UNIT_ARIA_LABEL}
          data-test-subj={`alertZeroTriggerUnit-${workerId}`}
          onChange={(event) =>
            commit(Number(amountValue), event.target.value as ScheduleUnit, amountValue)
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
