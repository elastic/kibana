/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFieldNumber } from '@elastic/eui';

const FIELD_WIDTH_PX = 200;

const fieldWidth = css`
  width: ${FIELD_WIDTH_PX}px;
`;

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
 * input at its fixed width. The caller supplies the label, either through a SettingRow or an EuiFormRow.
 *
 * Each valid keystroke is published right away, so the page knows about unsaved changes while the
 * user types. An entry left invalid on blur or Enter falls back to the value from before the edit
 * and publishes it again: typing "31" over a saved 21 publishes 3 on the way, then restores 21.
 * A change to `value` re-syncs the input, which is how Discard restores it. A change that is not
 * this field's own value coming back, such as a reload or Discard, also becomes the new value to
 * fall back to.
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
  // Valid keystrokes are published as they are typed, so an abandoned out-of-range entry must
  // fall back to the value from before the edit, not to a valid prefix such as 15 of 150.
  const editStartRef = useRef(value);
  const lastPublishedRef = useRef<number | undefined>(undefined);

  const publish = (next: number) => {
    lastPublishedRef.current = next;
    onChange(next);
  };

  useEffect(() => {
    if (value !== lastPublishedRef.current) {
      editStartRef.current = value;
    }
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = parseBoundedNumber(draft, min, max);
    if (parsed === undefined) {
      if (value !== editStartRef.current) {
        publish(editStartRef.current);
      }
      setDraft(String(editStartRef.current));
      return;
    }
    editStartRef.current = parsed;
    if (parsed !== value) {
      publish(parsed);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitDraft();
    }
  };

  return (
    <div css={fieldWidth}>
      <EuiFieldNumber
        id={id}
        fullWidth
        min={min}
        max={max}
        step={1}
        value={draft}
        append={append}
        disabled={isDisabled}
        onChange={(event) => {
          const { value: text } = event.target;
          setDraft(text);
          const parsed = parseBoundedNumber(text, min, max);
          if (parsed !== undefined && parsed !== value) {
            publish(parsed);
          }
        }}
        onFocus={() => {
          editStartRef.current = value;
        }}
        onBlur={commitDraft}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        data-test-subj={testSubj}
      />
    </div>
  );
};
