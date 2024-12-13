/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NOT_AVAILABLE_LABEL = i18n.translate('xpack.observability.notAvailable', {
  defaultMessage: 'N/A',
});

// Comparators
export const BELOW_TEXT = i18n.translate(
  'xpack.observability.customThreshold.rule.threshold.below',
  {
    defaultMessage: 'below',
  }
);

export const BELOW_OR_EQ_TEXT = i18n.translate(
  'xpack.observability.customThreshold.rule.threshold.belowOrEqual',
  {
    defaultMessage: 'below or equal',
  }
);

export const ABOVE_TEXT = i18n.translate(
  'xpack.observability.customThreshold.rule.threshold.above',
  {
    defaultMessage: 'above',
  }
);

export const ABOVE_OR_EQ_TEXT = i18n.translate(
  'xpack.observability.customThreshold.rule.threshold.aboveOrEqual',
  {
    defaultMessage: 'above or equal',
  }
);

export const BETWEEN_TEXT = i18n.translate(
  'xpack.observability.customThreshold.rule.threshold.between',
  {
    defaultMessage: 'between',
  }
);

export const NOT_BETWEEN_TEXT = i18n.translate(
  'xpack.observability.customThreshold.rule.threshold.notBetween',
  {
    defaultMessage: 'not between',
  }
);
