/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

const toDisplay = (decimal: number) => Math.round(decimal * 100);
const toDecimal = (display: number) => display / 100;

interface UseMinimumConfidenceScoreDraftParams {
  /** Value in [0, 1] decimal range. */
  current: number;
  /** Called with the new value in [0, 1] decimal range. */
  onChange: (value: number) => void;
}

interface UseMinimumConfidenceScoreDraftResult {
  /** Value in [0, 100] display range, or '' for an uncommitted empty draft. */
  draft: number | '';
  onValueChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

/**
 * Draft/persist state for a 0–100% confidence score field that stores and emits its value as a
 * 0–1 decimal. Persists on blur (not per keystroke) and restores the last persisted value if
 * blurred while the field is empty, rather than writing a 0% floor.
 *
 * `'' ` is a distinct, uncommitted draft state — not a user-entered 0. `Number('')` is 0, so
 * treating an emptied field as 0 would drop the closure floor to 0% on blur (every
 * false-positive verdict becomes eligible for a close proposal or supervised auto-close)
 * any time the field passes through empty while being edited.
 */
export const useMinimumConfidenceScoreDraft = ({
  current,
  onChange,
}: UseMinimumConfidenceScoreDraftParams): UseMinimumConfidenceScoreDraftResult => {
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

  const onBlur = useCallback(() => {
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
    // Integer only: a fractional percentage (e.g. 85.6) would persist as 0.856, but the next
    // server echo redisplays it as Math.round(85.6) = 86 — showing an 86% floor while alerts
    // as low as 85.6% actually qualify for closure.
    if (!Number.isInteger(raw) || raw < 0 || raw > 100) {
      return;
    }
    draftRef.current = raw;
    setDraft(raw);
  }, []);

  return { draft, onValueChange, onBlur };
};
