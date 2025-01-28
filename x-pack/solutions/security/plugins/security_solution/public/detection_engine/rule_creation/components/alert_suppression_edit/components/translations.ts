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

export const ALERT_SUPPRESSION_NOT_SUPPORTED_FOR_EQL_SEQUENCE = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.notSupportedForEqlSequence',
  {
    defaultMessage: 'Suppression is not supported for EQL sequence queries',
  }
);

export const MACHINE_LEARNING_SUPPRESSION_FIELDS_LOADING = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.machineLearningSuppressionFieldsLoading',
  {
    defaultMessage: 'Machine Learning suppression fields are loading',
  }
);

export const MACHINE_LEARNING_NO_SUPPRESSION_FIELDS = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.machineLearningNoSuppressionFields',
  {
    defaultMessage:
      'Unable to load machine Learning suppression fields, start relevant Machine Learning jobs.',
  }
);

export const ESQL_SUPPRESSION_FIELDS_LOADING = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.esqlFieldsLoading',
  {
    defaultMessage: 'ES|QL suppression fields are loading',
  }
);

export const MACHINE_LEARNING_SUPPRESSION_INCOMPLETE_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.alertSuppression.machineLearningSuppressionIncomplete',
  {
    defaultMessage:
      'This list of fields might be incomplete as some Machine Learning jobs are not running. Start all relevant jobs for a complete list.',
  }
);
