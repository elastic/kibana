/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { FP_RATE_THRESHOLD_PCT_MAX, FP_RATE_THRESHOLD_PCT_MIN } from '@kbn/alertzero-common';
import * as i18n from './translations';

interface FpRateThresholdPctFieldProps {
  current: number;
  isDisabled?: boolean;
  onChange: (fpRateThresholdPct: number) => void;
}

const parseFpRateThresholdPct = (text: string): number | undefined => {
  const parsed = Number(text);
  return text !== '' &&
    Number.isInteger(parsed) &&
    parsed >= FP_RATE_THRESHOLD_PCT_MIN &&
    parsed <= FP_RATE_THRESHOLD_PCT_MAX
    ? parsed
    : undefined;
};

/** Rule Tuning FP rate threshold: buffers incomplete or out-of-range input locally and publishes every valid edit to the page draft immediately. */
export const FpRateThresholdPctField: React.FC<FpRateThresholdPctFieldProps> = ({
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
      const parsed = parseFpRateThresholdPct(text);
      if (parsed !== undefined && parsed !== current) {
        onChange(parsed);
      }
    },
    [current, onChange]
  );

  const revertInvalidDraft = useCallback(() => {
    if (parseFpRateThresholdPct(draft) === undefined) {
      setDraft(String(current));
    }
  }, [current, draft]);

  return (
    <EuiFormRow
      label={i18n.FP_RATE_THRESHOLD_PCT_LABEL}
      helpText={i18n.FP_RATE_THRESHOLD_PCT_HELP}
      fullWidth
      data-test-subj="alertZeroFpRateThresholdPctField"
    >
      <EuiFieldNumber
        fullWidth
        min={FP_RATE_THRESHOLD_PCT_MIN}
        max={FP_RATE_THRESHOLD_PCT_MAX}
        step={1}
        value={draft}
        disabled={isDisabled}
        onChange={onDraftChange}
        onBlur={revertInvalidDraft}
        aria-label={i18n.FP_RATE_THRESHOLD_PCT_ARIA_LABEL}
        data-test-subj="alertZeroFpRateThresholdPct"
      />
    </EuiFormRow>
  );
};
