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

const parseAnalysisWindowDays = (text: string): number | undefined => {
  const parsed = Number(text);
  return text !== '' &&
    Number.isInteger(parsed) &&
    parsed >= ANALYSIS_WINDOW_DAYS_MIN &&
    parsed <= ANALYSIS_WINDOW_DAYS_MAX
    ? parsed
    : undefined;
};

/** Rule Tuning analysis window: buffers incomplete or out-of-range input locally and publishes every valid edit to the page draft immediately. */
export const AnalysisWindowDaysField: React.FC<AnalysisWindowDaysFieldProps> = ({
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
      const parsed = parseAnalysisWindowDays(text);
      if (parsed !== undefined && parsed !== current) {
        onChange(parsed);
      }
    },
    [current, onChange]
  );

  const revertInvalidDraft = useCallback(() => {
    if (parseAnalysisWindowDays(draft) === undefined) {
      setDraft(String(current));
    }
  }, [current, draft]);

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
        onChange={onDraftChange}
        onBlur={revertInvalidDraft}
        aria-label={i18n.ANALYSIS_WINDOW_DAYS_ARIA_LABEL}
        data-test-subj="alertZeroAnalysisWindowDays"
      />
    </EuiFormRow>
  );
};
