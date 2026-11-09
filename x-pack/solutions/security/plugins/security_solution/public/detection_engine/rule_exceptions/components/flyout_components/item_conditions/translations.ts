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

export const APPLIES_TO_LABEL = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.appliesToLabel',
  {
    defaultMessage: 'Applies to',
  }
);

export const APPLIES_TO_LEGEND = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.appliesToLegend',
  {
    defaultMessage: 'What the exception applies to',
  }
);

export const APPLIES_TO_SOURCE_DOCUMENTS = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.appliesToSourceDocuments',
  {
    defaultMessage: 'Source fields',
  }
);

export const APPLIES_TO_COMPUTED_COLUMNS = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.appliesToComputedColumns',
  {
    defaultMessage: 'Computed columns',
  }
);

export const COMPUTED_COLUMNS_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.computedColumnsWarningTitle',
  {
    defaultMessage: 'This exception only applies to ES|QL rules',
  }
);

export const COMPUTED_COLUMNS_NO_EFFECT_WARNING_TITLE = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.computedColumnsNoEffectWarningTitle',
  {
    defaultMessage: 'This exception has no effect on the selected rules',
  }
);

export const COMPUTED_COLUMNS_NO_EFFECT_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.computedColumnsNoEffectWarningBody',
  {
    defaultMessage:
      'It only applies to ES|QL rules, and none of the selected rules is an ES|QL rule. It takes effect on ES|QL rules that use the list that holds it.',
  }
);

export const COMPUTED_COLUMNS_WARNING_BODY = i18n.translate(
  'xpack.securitySolution.rule_exceptions.flyoutComponents.itemConditions.computedColumnsWarningBody',
  {
    defaultMessage:
      'It excludes the rows that the ES|QL rule query returns, using the columns that the query computes, such as columns created with EVAL or STATS.',
  }
);
