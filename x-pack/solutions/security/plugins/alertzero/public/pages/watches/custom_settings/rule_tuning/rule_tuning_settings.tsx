/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import {
  RULE_TUNING_DEFAULT_EXTRAS,
  RuleTuningWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { AnalysisWindowDaysField } from './analysis_window_days_field';
import { FpCountThresholdField } from './fp_count_threshold_field';
import { FpRateThresholdPctField } from './fp_rate_threshold_pct_field';
import type { WorkerCustomSettingsComponent } from '../types';

/** The server projects complete extras; fall back to the defaults rather than crash a render. */
const readRuleTuningExtras = (settings: WorkerSettings): RuleTuningWorkerExtras => {
  const parsed = RuleTuningWorkerExtras.safeParse(settings.extras);
  return parsed.success ? parsed.data : RULE_TUNING_DEFAULT_EXTRAS;
};

/**
 * Detection Watch controls for the Rule Tuning Worker, rendered as a flat list. Every change hands
 * the complete `extras` object back to the page draft; adding a field means adding its control and
 * spreading it here.
 */
export const RuleTuningSettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const extras = readRuleTuningExtras(settings);

  return (
    <>
      <EuiSpacer size="m" />
      <AnalysisWindowDaysField
        current={extras.analysisWindowDays}
        isDisabled={isDisabled}
        onChange={(analysisWindowDays) => onExtrasChange({ ...extras, analysisWindowDays })}
      />
      <FpCountThresholdField
        current={extras.fpCountThreshold}
        isDisabled={isDisabled}
        onChange={(fpCountThreshold) => onExtrasChange({ ...extras, fpCountThreshold })}
      />
      <FpRateThresholdPctField
        current={extras.fpRateThresholdPct}
        isDisabled={isDisabled}
        onChange={(fpRateThresholdPct) => onExtrasChange({ ...extras, fpRateThresholdPct })}
      />
    </>
  );
};
