/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EQL_QUERY_BAR_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.EqlQueryBarLabel',
  {
    defaultMessage: 'EQL query',
  }
);

export const EQL_VALIDATION_REQUEST_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlValidation.requestError',
  {
    defaultMessage: 'An error occurred while validating your EQL query',
  }
);

export const EQL_VALIDATION_ERRORS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlValidation.title',
  {
    defaultMessage: 'EQL Validation Errors',
  }
);

export const EQL_VALIDATION_ERROR_POPOVER_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlValidation.showErrorsLabel',
  {
    defaultMessage: 'Show EQL Validation Errors',
  }
);

export const EQL_OVERVIEW_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOverViewLink.text',
  {
    defaultMessage: 'Event Query Language (EQL) Overview',
  }
);

export const EQL_SETTINGS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlSettings.title',
  {
    defaultMessage: 'EQL settings',
  }
);

export const EQL_OPTIONS_SIZE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOptionsSize.label',
  {
    defaultMessage: 'Size',
  }
);

export const EQL_OPTIONS_SIZE_HELPER = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOptionsSize.text',
  {
    defaultMessage:
      'For basic queries, the maximum number of matching events to return. For sequence queries, the maximum number of matching sequences to return.',
  }
);

export const EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOptionsEventCategoryField.label',
  {
    defaultMessage: 'Event category field',
  }
);

export const EQL_OPTIONS_EVENT_CATEGORY_FIELD_HELPER = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOptionsEventCategoryField.text',
  {
    defaultMessage:
      'Field containing the event classification, such as process, file, or network. This field is typically mapped as a field type in the keyword family',
  }
);

export const EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOptionsEventTiebreakerField.label',
  {
    defaultMessage: 'Tiebreaker field',
  }
);

export const EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_HELPER = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOptionsEventTiebreakerField.text',
  {
    defaultMessage:
      'Field used to sort hits with the same timestamp in ascending, lexicographic order',
  }
);

export const EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOptionsEventTimestampField.label',
  {
    defaultMessage: 'Timestamp field',
  }
);

export const EQL_OPTIONS_EVENT_TIMESTAMP_FIELD_HELPER = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOptionsEventTimestampField.text',
  {
    defaultMessage: 'Field containing event timestamp',
  }
);
