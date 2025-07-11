/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FIELD = i18n.translate('xpack.securitySolution.threatMatch.fieldDescription', {
  defaultMessage: 'Field',
});

export const THREAT_FIELD = i18n.translate(
  'xpack.securitySolution.threatMatch.threatFieldDescription',
  {
    defaultMessage: 'Indicator index field',
  }
);

export const THREAT_FIELD_LABEL_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.threatMatch.threatFieldLabelHelpDescription',
  {
    defaultMessage:
      'Start with the MATCH condition, and refine it with additional MATCH/DOES NOT MATCH conditions if needed',
  }
);

export const FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.threatMatch.fieldPlaceholderDescription',
  {
    defaultMessage: 'Search',
  }
);

export const MATCHES = i18n.translate('xpack.securitySolution.threatMatch.matchesLabel', {
  defaultMessage: 'MATCHES',
});

export const DOES_NOT_MATCH = i18n.translate(
  'xpack.securitySolution.threatMatch.doesNotMatchLabel',
  {
    defaultMessage: 'DOES NOT MATCH',
  }
);

export const AND = i18n.translate('xpack.securitySolution.threatMatch.andDescription', {
  defaultMessage: 'AND',
});

export const OR = i18n.translate('xpack.securitySolution.threatMatch.orDescription', {
  defaultMessage: 'OR',
});
