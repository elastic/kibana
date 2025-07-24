/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MACHINE_LEARNING_SUPPRESSION_FIELDS_LOADING = i18n.translate(
  'xpack.securitySolution.ruleManagement.threeWayDiff.finalEdit.alertSuppression.machineLearningSuppressionFieldsLoading',
  {
    defaultMessage: 'Machine Learning suppression fields are loading',
  }
);

export const MACHINE_LEARNING_NO_SUPPRESSION_FIELDS = i18n.translate(
  'xpack.securitySolution.ruleManagement.threeWayDiff.finalEdit.alertSuppression.machineLearningNoSuppressionFields',
  {
    defaultMessage:
      'Unable to load machine Learning suppression fields, start relevant Machine Learning jobs.',
  }
);

export const MACHINE_LEARNING_SUPPRESSION_INCOMPLETE_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.threeWayDiff.finalEdit.alertSuppression.machineLearningSuppressionIncomplete',
  {
    defaultMessage:
      'This list of fields might be incomplete as some Machine Learning jobs are not running. Start all relevant jobs for a complete list.',
  }
);

export const ESQL_SUPPRESSION_FIELDS_LOADING = i18n.translate(
  'xpack.securitySolution.ruleManagement.threeWayDiff.finalEdit.alertSuppression.esqlFieldsLoading',
  {
    defaultMessage: 'ES|QL suppression fields are loading',
  }
);
