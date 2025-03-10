/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_NUMBER_OF_NEW_TERMS_FIELDS } from '../../../../../common/constants';

export const NEW_TERMS_FIELDS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.newTermsFieldsLabel',
  {
    defaultMessage: 'Fields',
  }
);

export const PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.newTermsField.placeholderText',
  {
    defaultMessage: 'Select a field',
  }
);

export const HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldNewTermsFieldHelpText',
  {
    defaultMessage: 'Select a field to check for new terms.',
  }
);

export const MIN_FIELDS_COUNT_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.newTermsField.minFieldsCountError',
  {
    defaultMessage: 'A minimum of one field is required.',
  }
);

export const MAX_FIELDS_COUNT_VALIDATION_ERROR = {
  length: MAX_NUMBER_OF_NEW_TERMS_FIELDS,
  message: i18n.translate(
    'xpack.securitySolution.detectionEngine.validations.stepDefineRule.newTermsField.maxFieldsCountError',
    {
      defaultMessage: 'Number of fields must be 3 or less.',
    }
  ),
};
