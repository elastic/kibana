/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';

interface BoundedNumberFieldProps {
  value: number;
  /** Inclusive bounds; a value outside them is held locally and never published. */
  min: number;
  max: number;
  label: string;
  helpText: string;
  ariaLabel: string;
  /** Applied to the input; the surrounding row gets `${testSubj}Field`. */
  testSubj: string;
  isDisabled?: boolean;
  onChange: (value: number) => void;
}

const parseBoundedNumber = (text: string, min: number, max: number): number | undefined => {
  const parsed = Number(text);
  return text !== '' && Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : undefined;
};

/**
 * Whole-number setting within fixed bounds, for the Watch page's Save/Discard draft.
 *
 * Typing "1" on the way to "12" would otherwise publish 1, so incomplete and out-of-range input
 * is held locally and only a valid value reaches the draft. Blur discards whatever never became
 * valid, and a change to `value` re-syncs the input, which is how Discard restores it.
 */
export const BoundedNumberField: React.FC<BoundedNumberFieldProps> = ({
  value,
  min,
  max,
  label,
  helpText,
  ariaLabel,
  testSubj,
  isDisabled,
  onChange,
}) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const onDraftChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      setDraft(text);
      const parsed = parseBoundedNumber(text, min, max);
      if (parsed !== undefined && parsed !== value) {
        onChange(parsed);
      }
    },
    [max, min, onChange, value]
  );

  const revertInvalidDraft = useCallback(() => {
    if (parseBoundedNumber(draft, min, max) === undefined) {
      setDraft(String(value));
    }
  }, [draft, max, min, value]);

  return (
    <EuiFormRow label={label} helpText={helpText} fullWidth data-test-subj={`${testSubj}Field`}>
      <EuiFieldNumber
        fullWidth
        min={min}
        max={max}
        step={1}
        value={draft}
        disabled={isDisabled}
        onChange={onDraftChange}
        onBlur={revertInvalidDraft}
        aria-label={ariaLabel}
        data-test-subj={testSubj}
      />
    </EuiFormRow>
  );
};
