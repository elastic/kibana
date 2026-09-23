/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ANALYSIS_WINDOW_DAYS_MAX,
  ANALYSIS_WINDOW_DAYS_MIN,
  FP_COUNT_THRESHOLD_MAX,
  FP_COUNT_THRESHOLD_MIN,
  FP_RATE_THRESHOLD_PCT_MAX,
  FP_RATE_THRESHOLD_PCT_MIN,
} from '@kbn/alertzero-common';

/** Copy for the Rule Tuning settings controls, owned by the Detection Watch team. */

export const ANALYSIS_WINDOW_DAYS_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.analysisWindowDays.label',
  { defaultMessage: 'Analysis window (days)' }
);

export const ANALYSIS_WINDOW_DAYS_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.analysisWindowDays.help',
  {
    defaultMessage:
      'How many days of alerts Rule Tuning analyses. Applies to this Worker only. Between {min} and {max}.',
    values: { min: ANALYSIS_WINDOW_DAYS_MIN, max: ANALYSIS_WINDOW_DAYS_MAX },
  }
);

export const ANALYSIS_WINDOW_DAYS_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.analysisWindowDays.ariaLabel',
  { defaultMessage: 'Analysis window in days' }
);

export const FP_COUNT_THRESHOLD_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpCountThreshold.label',
  { defaultMessage: 'FP count threshold' }
);

export const FP_COUNT_THRESHOLD_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.fpCountThreshold.help',
  {
    defaultMessage:
      'Minimum number of FP-closed alerts required to trigger analysis on a rule. Between {min} and {max}.',
    values: { min: FP_COUNT_THRESHOLD_MIN, max: FP_COUNT_THRESHOLD_MAX },
  }
);

export const FP_COUNT_THRESHOLD_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpCountThreshold.ariaLabel',
  { defaultMessage: 'False positive count threshold' }
);

export const FP_RATE_THRESHOLD_PCT_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpRateThresholdPct.label',
  { defaultMessage: 'FP rate threshold (%)' }
);

export const FP_RATE_THRESHOLD_PCT_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.fpRateThresholdPct.help',
  {
    defaultMessage:
      'Minimum FP rate, as a percentage of total alerts, required to trigger analysis. Between {min} and {max}.',
    values: { min: FP_RATE_THRESHOLD_PCT_MIN, max: FP_RATE_THRESHOLD_PCT_MAX },
  }
);

export const FP_RATE_THRESHOLD_PCT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpRateThresholdPct.ariaLabel',
  { defaultMessage: 'False positive rate threshold in percent' }
);
