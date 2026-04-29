/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LESS_THAN_WARNING = (maxNumber: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.maxAlertsFieldLessThanWarning',
    {
      values: { maxNumber },
      defaultMessage:
        'Kibana only allows a maximum of {maxNumber} {maxNumber, plural, =1 {alert} other {alerts}} per rule run.',
    }
  );

export const MAX_SIGNALS_HELP_TEXT = (defaultNumber: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldMaxAlertsHelpText',
    {
      values: { defaultNumber },
      defaultMessage:
        'The maximum number of alerts the rule will create each time it runs. Default is {defaultNumber}.',
    }
  );
