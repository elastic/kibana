/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { FP_COUNT_THRESHOLD_MAX, FP_COUNT_THRESHOLD_MIN } from '@kbn/alertzero-common';
import * as i18n from './translations';

interface FpCountThresholdFieldProps {
  current: number;
  isDisabled?: boolean;
  onChange: (fpCountThreshold: number) => void;
}

const parseFpCountThreshold = (text: string): number | undefined => {
  const parsed = Number(text);
  return text !== '' &&
    Number.isInteger(parsed) &&
    parsed >= FP_COUNT_THRESHOLD_MIN &&
    parsed <= FP_COUNT_THRESHOLD_MAX
    ? parsed
    : undefined;
};

/** Rule Tuning FP count threshold: buffers incomplete or out-of-range input locally and publishes every valid edit to the page draft immediately. */
export const FpCountThresholdField: React.FC<FpCountThresholdFieldProps> = ({
  current,
  isDisabled,
  onChange,
}) => {
  const [draft, setDraft] = useState(String(current));

  useEffect(() => {
    setDraft(String(current));
  }, [current]);

  const onDraftChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      setDraft(text);
      const parsed = parseFpCountThreshold(text);
      if (parsed !== undefined && parsed !== current) {
        onChange(parsed);
      }
    },
    [current, onChange]
  );

  const revertInvalidDraft = useCallback(() => {
    if (parseFpCountThreshold(draft) === undefined) {
      setDraft(String(current));
    }
  }, [current, draft]);

  return (
    <EuiFormRow
      label={i18n.FP_COUNT_THRESHOLD_LABEL}
      helpText={i18n.FP_COUNT_THRESHOLD_HELP}
      fullWidth
      data-test-subj="alertZeroFpCountThresholdField"
    >
      <EuiFieldNumber
        fullWidth
        min={FP_COUNT_THRESHOLD_MIN}
        max={FP_COUNT_THRESHOLD_MAX}
        step={1}
        value={draft}
        disabled={isDisabled}
        onChange={onDraftChange}
        onBlur={revertInvalidDraft}
        aria-label={i18n.FP_COUNT_THRESHOLD_ARIA_LABEL}
        data-test-subj="alertZeroFpCountThreshold"
      />
    </EuiFormRow>
  );
};
