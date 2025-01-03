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

export const FROM_OFFSET_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.from.label',
  {
    defaultMessage: 'Look-back time offset',
  }
);

export const FROM_OFFSET_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.from.helpText',
  {
    defaultMessage: 'Time offset from "now" for selecting source events for analysis.',
  }
);

export const TO_OFFSET_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.to.label',
  {
    defaultMessage: 'Last events time offset',
  }
);

export const TO_OFFSET_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleManagement.fields.to.helpText',
  {
    defaultMessage: 'Later events after specified time offset will be skipped from analysis.',
  }
);
