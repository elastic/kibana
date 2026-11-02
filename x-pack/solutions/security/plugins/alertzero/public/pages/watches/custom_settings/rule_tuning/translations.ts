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

export const QUALIFYING_THRESHOLDS_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.qualifyingThresholds.label',
  { defaultMessage: 'Qualifying thresholds' }
);

export const QUALIFYING_THRESHOLDS_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.qualifyingThresholds.help',
  {
    defaultMessage:
      'A rule qualifies for analysis only when both are met within the analysis window.',
  }
);

/** Shared help line under both threshold inputs; names the ranges an edit has to stay inside. */
export const QUALIFYING_THRESHOLDS_FIELDS_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.qualifyingThresholds.fieldsHelp',
  {
    defaultMessage:
      'Alerts closed as false positives within the analysis window. Count between {countMin} and {countMax}, rate between {rateMin} and {rateMax}%.',
    values: {
      countMin: FP_COUNT_THRESHOLD_MIN,
      countMax: FP_COUNT_THRESHOLD_MAX,
      rateMin: FP_RATE_THRESHOLD_PCT_MIN,
      rateMax: FP_RATE_THRESHOLD_PCT_MAX,
    },
  }
);

/** Conjunction rendered between the two threshold inputs. */
export const QUALIFYING_THRESHOLDS_AND = i18n.translate(
  'xpack.alertzero.watches.settings.qualifyingThresholds.and',
  { defaultMessage: 'and' }
);

export const FP_COUNT_THRESHOLD_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpCountThreshold.label',
  { defaultMessage: 'False positive count' }
);

export const FP_COUNT_THRESHOLD_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpCountThreshold.ariaLabel',
  { defaultMessage: 'False positive count threshold' }
);

export const FP_RATE_THRESHOLD_PCT_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpRateThresholdPct.label',
  { defaultMessage: 'False positive rate' }
);

export const FP_RATE_THRESHOLD_PCT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.fpRateThresholdPct.ariaLabel',
  { defaultMessage: 'False positive rate threshold in percent' }
);
