/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Conditions component
export const RULE_EXCEPTION_CONDITIONS = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.conditionsTitle',
  {
    defaultMessage: 'Conditions',
  }
);

export const EXCEPTION_BUILDER_INFO = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.infoLabel',
  {
    defaultMessage: "Alerts are generated when the rule's conditions are met, except when:",
  }
);

export const ADD_EXCEPTION_SEQUENCE_WARNING = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.sequenceWarningAdd',
  {
    defaultMessage:
      "This rule's query contains an EQL sequence statement. The exception created will apply to all events in the sequence.",
  }
);

export const EDIT_EXCEPTION_SEQUENCE_WARNING = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.sequenceWarningEdit',
  {
    defaultMessage:
      "This rule's query contains an EQL sequence statement. The exception modified will apply to all events in the sequence.",
  }
);

export const OPERATING_SYSTEM_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.operatingSystemPlaceHolder',
  {
    defaultMessage: 'Select an operating system',
  }
);
