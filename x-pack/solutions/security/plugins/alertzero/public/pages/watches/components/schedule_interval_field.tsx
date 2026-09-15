/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiText,
} from '@elastic/eui';
import * as i18n from '../settings_translations';

/** Schedule units offered by the "Every N unit" trigger control. */
const UNIT_OPTIONS = [
  { value: 'm', text: i18n.SCHEDULE_UNIT_MINUTES },
  { value: 'h', text: i18n.SCHEDULE_UNIT_HOURS },
  { value: 'd', text: i18n.SCHEDULE_UNIT_DAYS },
] as const;

type ScheduleUnit = (typeof UNIT_OPTIONS)[number]['value'];

const parseInterval = (interval: string | undefined): { amount: number; unit: ScheduleUnit } => {
  const match = /^(\d+)([mhd])$/.exec(interval ?? '');
  if (!match) return { amount: 1, unit: 'h' };
  return { amount: Number(match[1]), unit: match[2] as ScheduleUnit };
};

const formatInterval = (amount: number, unit: ScheduleUnit): string => {
  const safe = Number.isFinite(amount) && amount >= 1 ? Math.floor(amount) : 1;
  return `${safe}${unit}`;
};

interface ScheduleIntervalFieldProps {
  workerId: string;
  current: string;
  isDisabled?: boolean;
  onChange: (interval: string) => void;
}

/**
 * Trigger row ported from the Sep 14 prototype (notdaybreak_mvp
 * WorkerSettingsForm): plain "Every N unit" amount + unit select. Commits on
 * change; invalid amounts keep the last valid interval.
 */
export const ScheduleIntervalField: React.FC<ScheduleIntervalFieldProps> = ({
  workerId,
  current,
  isDisabled,
  onChange,
}) => {
  const { amount, unit } = useMemo(() => parseInterval(current), [current]);
  const [amountDraft, setAmountDraft] = useState<string | null>(null);

  const commit = useCallback(
    (nextAmount: number, nextUnit: ScheduleUnit) => {
      if (!Number.isFinite(nextAmount) || nextAmount < 1) {
        setAmountDraft(null);
        return;
      }
      setAmountDraft(null);
      onChange(formatInterval(nextAmount, nextUnit));
    },
    [onChange]
  );

  const amountValue = amountDraft ?? String(amount);
  const amountInvalid =
    amountDraft != null && (!/^\d+$/.test(amountDraft) || Number(amountDraft) < 1);

  return (
    <EuiFormRow
      label={i18n.TRIGGER_LABEL}
      helpText={i18n.TRIGGER_HELP_TEXT}
      fullWidth
      data-test-subj={`alertZeroTriggerRow-${workerId}`}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" wrap={false}>
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
                commit(next, unit);
              }
            }}
            onBlur={() => setAmountDraft(null)}
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
            options={UNIT_OPTIONS.map(({ value, text }) => ({ value, text }))}
            value={unit}
            compressed
            fullWidth
            disabled={isDisabled}
            aria-label={i18n.TRIGGER_UNIT_ARIA_LABEL}
            data-test-subj={`alertZeroTriggerUnit-${workerId}`}
            onChange={(event) => commit(amount, event.target.value as ScheduleUnit)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
