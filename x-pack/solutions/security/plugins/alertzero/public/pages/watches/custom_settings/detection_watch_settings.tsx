/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  RULE_TUNING_DEFAULT_EXTRAS,
  RuleTuningWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { AnalysisWindowDaysField } from './analysis_window_days_field';
import * as i18n from './detection_translations';
import type { WorkerCustomSettingsComponent } from './types';

/** The server projects complete extras; fall back to the defaults rather than crash a render. */
const readRuleTuningExtras = (settings: WorkerSettings): RuleTuningWorkerExtras => {
  const parsed = RuleTuningWorkerExtras.safeParse(settings.extras);
  return parsed.success ? parsed.data : RULE_TUNING_DEFAULT_EXTRAS;
};

/**
 * Detection Watch controls for the Rule Tuning Worker. Every change hands the complete `extras`
 * object back to the page draft; adding a field means adding its control and spreading it here.
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
      <EuiTitle size="xxs">
        <h3>{i18n.TUNING_THRESHOLDS_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <AnalysisWindowDaysField
        current={extras.analysisWindowDays}
        isDisabled={isDisabled}
        onChange={(analysisWindowDays) => onExtrasChange({ ...extras, analysisWindowDays })}
      />
    </>
  );
};
