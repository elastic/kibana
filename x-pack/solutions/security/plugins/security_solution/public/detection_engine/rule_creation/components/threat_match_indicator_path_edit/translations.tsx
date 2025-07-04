/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THREAT_MATCH_INDICATOR_PATH_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.threatMatchIndicatorPath.label',
  {
    defaultMessage: 'Indicator prefix override',
  }
);

export const THREAT_MATCH_INDICATOR_PATH_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.threatMatchIndicatorPath.helpText',
  {
    defaultMessage:
      'Specify the document prefix containing your indicator fields. Used for enrichment of indicator match alerts.',
  }
);

export const THREAT_MATCH_INDICATOR_PATH_FIELD_VALIDATION_REQUIRED_ERROR = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.threatMatchIndicatorPath.validator.requiredError',
  {
    defaultMessage: 'Indicator prefix override must not be empty',
  }
);
