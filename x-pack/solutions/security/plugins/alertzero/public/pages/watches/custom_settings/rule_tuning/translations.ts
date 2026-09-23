/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Copy for the Rule Tuning settings controls, owned by the Detection Watch team. */

export const ANALYSIS_WINDOW_DAYS_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.analysisWindowDays.label',
  { defaultMessage: 'Analysis window (days)' }
);

export const ANALYSIS_WINDOW_DAYS_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.analysisWindowDays.help',
  {
    defaultMessage:
      'How many days of alerts Rule Tuning analyses. Applies to this Worker only. Between 1 and 30.',
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
      'Minimum number of FP-closed alerts required to trigger analysis on a rule. Between 2 and 100.',
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
      'Minimum FP rate, as a percentage of total alerts, required to trigger analysis. Between 0 and 100.',
  }
);

export const FP_RATE_THRESHOLD_PCT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpRateThresholdPct.ariaLabel',
  { defaultMessage: 'False positive rate threshold in percent' }
);
