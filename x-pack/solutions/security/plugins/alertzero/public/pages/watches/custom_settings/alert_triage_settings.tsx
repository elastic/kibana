/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ALERT_TRIAGE_DEFAULT_EXTRAS,
  AlertTriageWorkerExtras,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { MinimumConfidenceScoreField } from '../components/minimum_confidence_score_field';
import { SettingRow } from '../components/setting_row';
import * as i18n from '../settings_translations';
import type { WorkerCustomSettingsComponent } from './types';

/** The server projects complete extras; fall back to the defaults rather than crash a render. */
const readAlertTriageExtras = (settings: WorkerSettings): AlertTriageWorkerExtras => {
  const parsed = AlertTriageWorkerExtras.safeParse(settings.extras);
  return parsed.success ? parsed.data : ALERT_TRIAGE_DEFAULT_EXTRAS;
};

/**
 * Watch-owned controls for the Alert Triage Worker's extras. Every change hands the complete
 * `extras` object back to the page draft.
 */
export const AlertTriageSettings: WorkerCustomSettingsComponent = ({
  settings,
  isDisabled,
  onExtrasChange,
}) => {
  const extras = readAlertTriageExtras(settings);

  return (
    <SettingRow
      label={i18n.MINIMUM_CONFIDENCE_SCORE_LABEL}
      labelHelp={i18n.MINIMUM_CONFIDENCE_SCORE_HELP_TEXT}
      data-test-subj="alertZeroMinimumConfidenceScoreRow"
    >
      <MinimumConfidenceScoreField
        current={extras.autoCloseConfidenceScoreMinThreshold}
        isDisabled={isDisabled}
        onChange={(autoCloseConfidenceScoreMinThreshold) =>
          onExtrasChange({ ...extras, autoCloseConfidenceScoreMinThreshold })
        }
      />
    </SettingRow>
  );
};
