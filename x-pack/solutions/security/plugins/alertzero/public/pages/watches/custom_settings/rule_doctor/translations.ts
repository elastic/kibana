/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_OUTCOMES_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.ruleOutcomes.label',
  { defaultMessage: 'Rules to review' }
);

export const RULE_OUTCOMES_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.ruleOutcomes.help',
  {
    defaultMessage:
      'Which rules each run sends for review, by the outcome of their last run. With both, failed rules go first. Rules whose source data stopped arriving are reviewed either way.',
  }
);

export const RULE_OUTCOMES_FAILED_AND_WARNING = i18n.translate(
  'xpack.alertzero.watches.settings.ruleOutcomes.failedAndWarning',
  { defaultMessage: 'Failed and warning' }
);

export const RULE_OUTCOMES_FAILED = i18n.translate(
  'xpack.alertzero.watches.settings.ruleOutcomes.failed',
  { defaultMessage: 'Failed only' }
);

export const RULE_OUTCOMES_WARNING = i18n.translate(
  'xpack.alertzero.watches.settings.ruleOutcomes.warning',
  { defaultMessage: 'Warning only' }
);
