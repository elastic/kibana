/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_SUPPRESSION_SUPPRESS_BY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.fieldsSelector.label',
  {
    defaultMessage: 'Suppress alerts by',
  }
);

export const ALERT_SUPPRESSION_SUPPRESS_BY_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.suppressByFields.helpText',
  {
    defaultMessage: 'Select field(s) to use for suppressing extra alerts',
  }
);

export const ALERT_SUPPRESSION_DURATION_PER_RULE_EXECUTION_OPTION = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.suppressionDuration.perRuleExecutionOption',
  {
    defaultMessage: 'Per rule execution',
  }
);

export const ALERT_SUPPRESSION_DURATION_PER_TIME_PERIOD_OPTION = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.suppressionDuration.perTimePeriodOption',
  {
    defaultMessage: 'Per time period',
  }
);

export const ALERT_SUPPRESSION_MISSING_FIELDS_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.missingFields.label',
  {
    defaultMessage: 'If a suppression field is missing',
  }
);

export const ALERT_SUPPRESSION_MISSING_FIELDS_SUPPRESS_OPTION = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.missingFields.suppressOption',
  {
    defaultMessage: 'Suppress and group alerts for events with missing fields',
  }
);

export const ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS_OPTION = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.missingFields.doNotSuppressOption',
  {
    defaultMessage: 'Do not suppress alerts for events with missing fields',
  }
);

export const ALERT_SUPPRESSION_MISSING_FIELDS_HELP_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.missingFields.helpAriaLabel',
  {
    defaultMessage: 'Alert suppression missing fields help',
  }
);
