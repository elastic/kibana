/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  LOOKBACK_DAYS_MAX,
  LOOKBACK_DAYS_MIN,
  MAX_GAPS_PER_RUN_MAX,
  MAX_GAPS_PER_RUN_MIN,
} from '@kbn/alertzero-common';

export const LOOKBACK_DAYS_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.lookbackDays.label',
  { defaultMessage: 'Lookback (days)' }
);

export const LOOKBACK_DAYS_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.lookbackDays.help',
  {
    defaultMessage:
      'How many days back each run looks for pending coverage gaps. Older gaps are not reviewed. Between {min} and {max}.',
    values: { min: LOOKBACK_DAYS_MIN, max: LOOKBACK_DAYS_MAX },
  }
);

export const LOOKBACK_DAYS_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.lookbackDays.ariaLabel',
  { defaultMessage: 'Lookback in days' }
);

export const MAX_GAPS_PER_RUN_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.maxGapsPerRun.label',
  { defaultMessage: 'Max gaps per run' }
);

export const MAX_GAPS_PER_RUN_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.maxGapsPerRun.help',
  {
    defaultMessage: 'How many coverage gap reviews each run starts. Between {min} and {max}.',
    values: { min: MAX_GAPS_PER_RUN_MIN, max: MAX_GAPS_PER_RUN_MAX },
  }
);

export const MAX_GAPS_PER_RUN_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.maxGapsPerRun.ariaLabel',
  { defaultMessage: 'Maximum gaps per run' }
);
