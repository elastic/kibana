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
  BUDGET_PER_HOUR_MAX,
  LOOKBACK_HOURS_MAX,
  LOOKBACK_HOURS_MIN,
  getMinBudgetPerHour,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { MinimumConfidenceScoreField } from '../components/minimum_confidence_score_field';
import { SettingRow } from '../components/setting_row';
import { BoundedNumberField } from './bounded_number_field';
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
  const minBudgetPerHour = getMinBudgetPerHour(settings.scheduleInterval);

  return (
    <>
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
      <SettingRow
        label={i18n.BUDGET_PER_HOUR_LABEL}
        labelHelp={i18n.getBudgetPerHourHelpText(minBudgetPerHour)}
        data-test-subj="alertZeroBudgetPerHourRow"
      >
        <BoundedNumberField
          value={extras.budgetPerHour}
          min={minBudgetPerHour}
          max={BUDGET_PER_HOUR_MAX}
          ariaLabel={i18n.BUDGET_PER_HOUR_ARIA_LABEL}
          testSubj="alertZeroBudgetPerHour"
          isDisabled={isDisabled}
          onChange={(budgetPerHour) => onExtrasChange({ ...extras, budgetPerHour })}
        />
      </SettingRow>
      <SettingRow
        label={i18n.LOOKBACK_HOURS_LABEL}
        labelHelp={i18n.LOOKBACK_HOURS_HELP_TEXT}
        data-test-subj="alertZeroLookbackHoursRow"
      >
        <BoundedNumberField
          value={extras.lookbackHours}
          min={LOOKBACK_HOURS_MIN}
          max={LOOKBACK_HOURS_MAX}
          ariaLabel={i18n.LOOKBACK_HOURS_ARIA_LABEL}
          testSubj="alertZeroLookbackHours"
          isDisabled={isDisabled}
          onChange={(lookbackHours) => onExtrasChange({ ...extras, lookbackHours })}
        />
      </SettingRow>
    </>
  );
};
