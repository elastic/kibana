/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { fieldValidators, type FormData, type ValidationFunc } from '../../../shared_imports';

export function alertSuppressionFieldsValidatorFactory(): ValidationFunc<
  FormData,
  string,
  unknown
> {
  return fieldValidators.maxLengthField({
    length: 3,
    message: i18n.translate(
      'xpack.securitySolution.ruleManagement.ruleCreation.validation.alertSuppressionFields.maxLengthError',
      {
        defaultMessage: 'Number of grouping fields must be at most 3',
      }
    ),
  });
}
