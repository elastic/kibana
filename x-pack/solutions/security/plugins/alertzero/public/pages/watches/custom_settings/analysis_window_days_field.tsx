/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { ANALYSIS_WINDOW_DAYS_MAX, ANALYSIS_WINDOW_DAYS_MIN } from '@kbn/alertzero-common';
import * as i18n from './detection_translations';

interface AnalysisWindowDaysFieldProps {
  current: number;
  isDisabled?: boolean;
  onChange: (analysisWindowDays: number) => void;
}

/**
 * Detection Watch / Rule Tuning analysis window. The typed text is buffered locally and committed
 * to the page draft on blur, so partial input never reaches the draft; an out-of-range entry
 * reverts to `current`. The buffer follows `current`, which resets the field on Discard or refresh.
 */
export const AnalysisWindowDaysField: React.FC<AnalysisWindowDaysFieldProps> = ({
  current,
  isDisabled,
  onChange,
}) => {
  const [draft, setDraft] = useState(String(current));

  useEffect(() => {
    setDraft(String(current));
  }, [current]);

  const commit = useCallback(() => {
    const parsed = Number(draft);
    if (
      !Number.isInteger(parsed) ||
      parsed < ANALYSIS_WINDOW_DAYS_MIN ||
      parsed > ANALYSIS_WINDOW_DAYS_MAX
    ) {
      setDraft(String(current));
      return;
    }
    if (parsed !== current) {
      onChange(parsed);
    }
  }, [current, draft, onChange]);

  return (
    <EuiFormRow
      label={i18n.ANALYSIS_WINDOW_DAYS_LABEL}
      helpText={i18n.ANALYSIS_WINDOW_DAYS_HELP}
      fullWidth
      data-test-subj="alertZeroAnalysisWindowDaysField"
    >
      <EuiFieldNumber
        fullWidth
        min={ANALYSIS_WINDOW_DAYS_MIN}
        max={ANALYSIS_WINDOW_DAYS_MAX}
        step={1}
        value={draft}
        disabled={isDisabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        aria-label={i18n.ANALYSIS_WINDOW_DAYS_ARIA_LABEL}
        data-test-subj="alertZeroAnalysisWindowDays"
      />
    </EuiFormRow>
  );
};
