/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFieldNumber, EuiFormRow, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID } from '@kbn/alertzero-common';
import type { DetectionConfig, WatchAutonomyLevel } from '@kbn/alertzero-common';
import { ConsequenceFunnel } from './consequence_funnel';
import { ALERT_TRIAGE_CONSEQUENCE_ESTIMATES } from './consequence_estimates_data';
import * as i18n from '../settings_translations';

interface DetectionConfigFieldsProps {
  workerId: string;
  current: DetectionConfig;
  /** Autonomy level currently in effect — decides the funnel's outcome-stage label. */
  autonomy: WatchAutonomyLevel;
  isDisabled?: boolean;
  onChange: (next: DetectionConfig) => void;
}

const DEFAULT_CONFIDENCE = 0.85;
const DEFAULT_FP_COUNT = 10;

/**
 * confidenceThreshold ∈ [0,1]. Empty input is a draft-only state, not a valid
 * value, so it never reaches onChange.
 */
const confidenceError = (value: number | ''): string | undefined => {
  if (value === '' || !Number.isFinite(value)) {
    return i18n.CONFIDENCE_THRESHOLD_ERROR;
  }
  if (value < 0 || value > 1) {
    return i18n.CONFIDENCE_THRESHOLD_ERROR;
  }
  return undefined;
};

/** fpCountThreshold: a positive integer. */
const fpCountError = (value: number | ''): string | undefined => {
  if (value === '' || !Number.isFinite(value)) {
    return i18n.FP_COUNT_THRESHOLD_ERROR;
  }
  if (!Number.isInteger(value) || value < 1) {
    return i18n.FP_COUNT_THRESHOLD_ERROR;
  }
  return undefined;
};

/**
 * The two numeric detectionConfig field controls (confidenceThreshold,
 * fpCountThreshold), plus — for Alert Triage only — the ConsequenceFunnel
 * visualization above them, driven by the current draft values. Ported from
 * the Sep 11 prototype's WorkerSettingsForm.tsx (Auto-close section).
 *
 * Mirrors ScheduleIntervalField's draft/commit-on-blur pattern: EuiFieldNumber
 * fires onChange per keystroke, so a value is only persisted on blur.
 * Out-of-range or non-numeric drafts show an inline EUI error and are never
 * sent to onChange — the server enforces the same [0,1] / positive-integer
 * bounds and would reject them anyway.
 */
export const DetectionConfigFields: React.FC<DetectionConfigFieldsProps> = ({
  workerId,
  current,
  autonomy,
  isDisabled,
  onChange,
}) => {
  const [confidenceDraft, setConfidenceDraft] = useState<number | ''>(
    current.confidenceThreshold ?? DEFAULT_CONFIDENCE
  );
  const [fpCountDraft, setFpCountDraft] = useState<number | ''>(
    current.fpCountThreshold ?? DEFAULT_FP_COUNT
  );
  const currentRef = useRef(current);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Re-sync when the server echoes a different value — the mutation is optimistic and rolls
  // back on a settings conflict, same as ScheduleIntervalField.
  useEffect(() => {
    currentRef.current = current;
    setConfidenceDraft(current.confidenceThreshold ?? DEFAULT_CONFIDENCE);
    setFpCountDraft(current.fpCountThreshold ?? DEFAULT_FP_COUNT);
  }, [current]);

  const onConfidenceChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === '') {
      setConfidenceDraft('');
      return;
    }
    const next = event.target.valueAsNumber;
    if (Number.isFinite(next)) {
      setConfidenceDraft(next);
    }
  }, []);

  const onFpCountChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === '') {
      setFpCountDraft('');
      return;
    }
    const next = event.target.valueAsNumber;
    if (Number.isFinite(next)) {
      setFpCountDraft(next);
    }
  }, []);

  const onConfidenceBlur = useCallback(() => {
    if (confidenceError(confidenceDraft)) {
      return;
    }
    const value = confidenceDraft as number;
    if (value === currentRef.current.confidenceThreshold) {
      return;
    }
    onChangeRef.current({ confidenceThreshold: value });
  }, [confidenceDraft]);

  const onFpCountBlur = useCallback(() => {
    if (fpCountError(fpCountDraft)) {
      return;
    }
    const value = fpCountDraft as number;
    if (value === currentRef.current.fpCountThreshold) {
      return;
    }
    onChangeRef.current({ fpCountThreshold: value });
  }, [fpCountDraft]);

  const confidenceInvalid = Boolean(confidenceError(confidenceDraft));
  const fpCountInvalid = Boolean(fpCountError(fpCountDraft));

  // Freeze the funnel on the last valid confidence score while the live draft is invalid, so an
  // in-progress edit doesn't compute a funnel off a NaN / out-of-range value.
  const [confidenceBasis, setConfidenceBasis] = useState<number>(
    current.confidenceThreshold ?? DEFAULT_CONFIDENCE
  );
  useEffect(() => {
    if (!confidenceInvalid) {
      setConfidenceBasis(confidenceDraft as number);
    }
  }, [confidenceDraft, confidenceInvalid]);

  const showFunnel = workerId === SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;

  const funnelSteps = useMemo(() => {
    const qualifying = ALERT_TRIAGE_CONSEQUENCE_ESTIMATES.qualifyAtOrAbove(confidenceBasis);
    const outcomeLabel =
      autonomy === 'manual'
        ? i18n.FUNNEL_OUTCOME_PROPOSED_LABEL
        : i18n.FUNNEL_OUTCOME_AUTO_CLOSED_LABEL;
    return [
      {
        value: i18n.funnelAlertsPerDay(ALERT_TRIAGE_CONSEQUENCE_ESTIMATES.alertsPerDay),
        label: i18n.FUNNEL_ALERTS_PER_DAY_LABEL,
      },
      {
        value: i18n.funnelFpVerdictsPerDay(ALERT_TRIAGE_CONSEQUENCE_ESTIMATES.fpVerdictsPerDay),
        label: i18n.FUNNEL_FP_VERDICTS_LABEL,
      },
      {
        value: qualifying,
        label: i18n.funnelQualifyingLabel(confidenceBasis.toFixed(2)),
        accent: true,
      },
      {
        value: qualifying,
        label: outcomeLabel,
        outcome: true,
      },
    ];
  }, [autonomy, confidenceBasis]);

  return (
    <div data-test-subj="alertZeroDetectionConfigFields">
      <EuiTitle size="xs">
        <h3>{i18n.DETECTION_CONFIG_SECTION_TITLE}</h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>{i18n.DETECTION_CONFIG_SECTION_TITLE_HELP}</p>
      </EuiText>
      {showFunnel ? <ConsequenceFunnel steps={funnelSteps} /> : <EuiSpacer size="m" />}
      <EuiFormRow
        label={i18n.CONFIDENCE_THRESHOLD_LABEL}
        isInvalid={confidenceInvalid}
        error={confidenceInvalid ? i18n.CONFIDENCE_THRESHOLD_ERROR : undefined}
        fullWidth
        data-test-subj="alertZeroConfidenceThresholdField"
      >
        <EuiFieldNumber
          fullWidth
          compressed
          min={0}
          max={1}
          step="any"
          value={confidenceDraft}
          disabled={isDisabled}
          isInvalid={confidenceInvalid}
          onChange={onConfidenceChange}
          onBlur={onConfidenceBlur}
          aria-label={i18n.CONFIDENCE_THRESHOLD_ARIA_LABEL}
          data-test-subj="alertZeroConfidenceThresholdValue"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.FP_COUNT_THRESHOLD_LABEL}
        helpText={i18n.FP_COUNT_THRESHOLD_HELP_TEXT}
        isInvalid={fpCountInvalid}
        error={fpCountInvalid ? i18n.FP_COUNT_THRESHOLD_ERROR : undefined}
        fullWidth
        data-test-subj="alertZeroFpCountThresholdField"
      >
        <EuiFieldNumber
          fullWidth
          compressed
          min={1}
          step={1}
          value={fpCountDraft}
          disabled={isDisabled}
          isInvalid={fpCountInvalid}
          onChange={onFpCountChange}
          onBlur={onFpCountBlur}
          aria-label={i18n.FP_COUNT_THRESHOLD_ARIA_LABEL}
          data-test-subj="alertZeroFpCountThresholdValue"
        />
      </EuiFormRow>
    </div>
  );
};
