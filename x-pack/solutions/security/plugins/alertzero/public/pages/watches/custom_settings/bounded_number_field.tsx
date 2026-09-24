/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFieldNumber } from '@elastic/eui';

interface BoundedNumberFieldProps {
  value: number;
  /** Inclusive bounds; a value outside them is held locally and never published. */
  min: number;
  max: number;
  ariaLabel: string;
  /** Id of help text the input should announce, beyond what its SettingRow group already does. */
  ariaDescribedBy?: string;
  testSubj: string;
  /** Unit shown inside the control, e.g. `%`. */
  append?: string;
  /** Set by a wrapping EuiFormRow so its label points at the input. */
  id?: string;
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
 * Whole-number setting within fixed bounds, for the Watch page's Save/Discard draft. Renders the
 * bare input; the caller supplies the label, either through a SettingRow or an EuiFormRow.
 *
 * The edit is buffered for the whole focus session and published once, on blur or Enter, and
 * only if it is valid. Publishing per keystroke would leak valid prefixes: typing "31" over a
 * saved 21 would publish 3, and the later revert would land on 3 instead of 21. An invalid or
 * incomplete final value is discarded and the input snaps back to `value`; a change to `value`
 * re-syncs the input, which is how Discard restores it.
 */
export const BoundedNumberField: React.FC<BoundedNumberFieldProps> = ({
  value,
  min,
  max,
  ariaLabel,
  ariaDescribedBy,
  testSubj,
  append,
  id,
  isDisabled,
  onChange,
}) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = parseBoundedNumber(draft, min, max);
    if (parsed === undefined) {
      setDraft(String(value));
      return;
    }
    if (parsed !== value) {
      onChange(parsed);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitDraft();
    }
  };

  return (
    <EuiFieldNumber
      id={id}
      fullWidth
      min={min}
      max={max}
      step={1}
      value={draft}
      append={append}
      disabled={isDisabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-test-subj={testSubj}
    />
  );
};
