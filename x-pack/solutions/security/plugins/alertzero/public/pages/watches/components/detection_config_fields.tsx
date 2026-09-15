/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import type { DetectionConfig, WatchAutonomyLevel } from '@kbn/alertzero-common';
import * as i18n from '../settings_translations';

interface DetectionConfigFieldsProps {
  workerId: string;
  current: DetectionConfig;
  autonomy: WatchAutonomyLevel;
  isDisabled?: boolean;
  onChange: (config: DetectionConfig) => void;
}

/**
 * Auto-close tuning for detection-oriented Workers, ported from the Sep 14
 * prototype (notdaybreak_mvp WorkerSettingsForm "Auto-close" group): a single
 * "Minimum confidence score" row (0–1). The autonomy level decides whether
 * closures at/above the score happen automatically or as Proposals — this
 * field only sets the bar. fpCountThreshold remains in the data model but has
 * no MVP control (rule-tuning thresholds ship with their watch page).
 */
export const DetectionConfigFields: React.FC<DetectionConfigFieldsProps> = ({
  workerId,
  current,
  isDisabled,
  onChange,
}) => {
  const [confidenceDraft, setConfidenceDraft] = useState<string | null>(null);

  const commitRef = useRef(onChange);
  commitRef.current = onChange;
  const currentRef = useRef(current);
  currentRef.current = current;

  const confidenceValue = confidenceDraft ?? String(current.confidenceThreshold ?? '');
  const confidenceInvalid = useMemo(() => {
    const parsed = Number(confidenceValue);
    return confidenceValue !== '' && (!Number.isFinite(parsed) || parsed < 0 || parsed > 1);
  }, [confidenceValue]);

  const commitConfidence = useCallback(() => {
    if (confidenceDraft == null) return;
    const parsed = Number(confidenceDraft);
    setConfidenceDraft(null);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return;
    if (parsed === currentRef.current.confidenceThreshold) return;
    commitRef.current({ ...currentRef.current, confidenceThreshold: parsed });
  }, [confidenceDraft]);

  return (
    <EuiFormRow
      label={i18n.AUTO_CLOSE_GROUP_TITLE}
      helpText={i18n.MIN_CONFIDENCE_HELP_TEXT}
      fullWidth
      data-test-subj={`alertZeroAutoCloseRow-${workerId}`}
    >
      <EuiFieldNumber
        value={confidenceValue}
        compressed
        min={0}
        max={1}
        step={0.01}
        isInvalid={confidenceInvalid}
        disabled={isDisabled}
        aria-label={i18n.MIN_CONFIDENCE_ARIA_LABEL}
        data-test-subj={`alertZeroMinConfidence-${workerId}`}
        onChange={(event) => setConfidenceDraft(event.target.value)}
        onBlur={commitConfidence}
      />
    </EuiFormRow>
  );
};
