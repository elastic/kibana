/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Copy for the Rule Tuning settings controls, owned by the Detection Watch team. */

export const TUNING_THRESHOLDS_TITLE = i18n.translate(
  'xpack.alertzero.watches.settings.tuningThresholds.title',
  { defaultMessage: 'Tuning thresholds' }
);

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

export const RULE_TUNING_AGENT_SECTION_TITLE = i18n.translate(
  'xpack.alertzero.watches.settings.ruleTuningAgent.sectionTitle',
  { defaultMessage: 'Agent' }
);

export const RULE_TUNING_AGENT_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.ruleTuningAgent.label',
  { defaultMessage: 'Rule Tuning agent' }
);

export const RULE_TUNING_AGENT_HELP = i18n.translate(
  'xpack.alertzero.watches.settings.ruleTuningAgent.help',
  {
    defaultMessage:
      'Agent used to diagnose each noisy rule in a tuning run. Applies to this Worker only. Leave unchanged to keep using the default agent.',
  }
);

export const RULE_TUNING_AGENT_ARIA_LABEL = i18n.translate(
  'xpack.alertzero.watches.settings.ruleTuningAgent.ariaLabel',
  { defaultMessage: 'Rule Tuning agent' }
);
