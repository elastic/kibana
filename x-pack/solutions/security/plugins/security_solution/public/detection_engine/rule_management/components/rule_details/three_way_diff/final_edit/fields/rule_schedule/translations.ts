/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INTERVAL_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.interval.label',
  {
    defaultMessage: 'Runs every',
  }
);

export const INTERVAL_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.interval.helpText',
  {
    defaultMessage: 'Rules run periodically and detect alerts within the specified time frame.',
  }
);

export const LOOK_BACK_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.lookback.label',
  {
    defaultMessage: 'Additional look-back time',
  }
);

export const LOOK_BACK_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.lookback.helpText',
  {
    defaultMessage: 'Adds time to the look-back period to prevent missed alerts.',
  }
);

export const FROM_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.from.label',
  {
    defaultMessage: 'From',
  }
);

export const TO_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.to.label',
  {
    defaultMessage: 'To',
  }
);

export const DATE_MATH_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.from.helpText',
  {
    defaultMessage: 'Date math expression, e.g. "now", "now-3d", "now+2m".',
  }
);
