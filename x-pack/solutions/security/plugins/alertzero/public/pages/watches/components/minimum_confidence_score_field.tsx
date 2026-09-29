/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFieldNumber } from '@elastic/eui';
import * as i18n from '../settings_translations';

interface MinimumConfidenceScoreFieldProps {
  /** Value in [0, 1] decimal range. */
  current: number;
  isDisabled?: boolean;
  /** Called with the new value in [0, 1] decimal range. */
  onChange: (value: number) => void;
}

const toDisplay = (decimal: number) => Math.round(decimal * 100);
const toDecimal = (display: number) => display / 100;

/** Compact width so the control sits beside the SettingRow label instead of stretching full-bleed. */
const FIELD_WIDTH_PX = 120;

/**
 * Confidence score field for Alert Triage Worker. Displays as 0–100% (integer),
 * stores and emits as 0–1 decimal. Persists on blur to avoid mid-type API calls.
 * Label/help live on the surrounding `SettingRow`; this is the control only.
 */
export const MinimumConfidenceScoreField: React.FC<MinimumConfidenceScoreFieldProps> = ({
  current,
  isDisabled,
  onChange,
}) => {
  // '' is a distinct, uncommitted draft state — not a user-entered 0. `Number('')` is 0, so
  // treating an emptied field as 0 would drop the closure floor to 0% on blur (every
  // false-positive verdict becomes eligible for a close proposal or supervised auto-close)
  // any time the field passes through empty while being edited.
  const [draft, setDraft] = useState<number | ''>(() => toDisplay(current));
  const draftRef = useRef<number | ''>(toDisplay(current));
  const lastPersistedRef = useRef(toDecimal(toDisplay(current)));
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  useEffect(() => {
    lastPersistedRef.current = toDecimal(toDisplay(current));
    const next = toDisplay(current);
    draftRef.current = next;
    setDraft(next);
  }, [current]);

  const persist = useCallback(() => {
    if (draftRef.current === '') {
      // Blurred while empty: restore the last persisted value rather than writing a 0% floor.
      const restored = toDisplay(lastPersistedRef.current);
      draftRef.current = restored;
      setDraft(restored);
      return;
    }
    const decimal = toDecimal(draftRef.current);
    if (decimal === lastPersistedRef.current) {
      return;
    }
    lastPersistedRef.current = decimal;
    onChangeRef.current(decimal);
  }, []);

  const onValueChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value === '') {
      draftRef.current = '';
      setDraft('');
      return;
    }
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
      return;
    }
    draftRef.current = raw;
    setDraft(raw);
  }, []);

  return (
    <div
      data-test-subj="alertZeroMinimumConfidenceScoreField"
      css={css`
        width: ${FIELD_WIDTH_PX}px;
      `}
    >
      <EuiFieldNumber
        compressed
        fullWidth
        min={0}
        max={100}
        value={draft}
        disabled={isDisabled}
        onChange={onValueChange}
        onBlur={persist}
        append="%"
        aria-label={i18n.MINIMUM_CONFIDENCE_SCORE_LABEL}
        data-test-subj="alertZeroMinimumConfidenceScoreInput"
      />
    </div>
  );
};
