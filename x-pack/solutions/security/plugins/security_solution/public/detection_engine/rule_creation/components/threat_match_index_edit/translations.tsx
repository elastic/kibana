/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THREAT_MATCH_INDEX_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.threatMatchIndex.label',
  {
    defaultMessage: 'Indicator index patterns',
  }
);

export const THREAT_MATCH_INDEX_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.threatMatchIndex.helpText',
  {
    defaultMessage: 'Select threat indices',
  }
);

export const RESET_TO_DEFAULT_THREAT_MATCH_INDEX = i18n.translate(
  'xpack.securitySolution.ruleManagement.ruleFields.threatMatchIndex.resetToDefaultIndices',
  {
    defaultMessage: 'Reset to default index patterns',
  }
);
