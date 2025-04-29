/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ERROR_CODE } from '../../../shared_imports';
import { fieldValidators, type FormData, type ValidationFunc } from '../../../shared_imports';

export const MIN_VALUE = 1;

export function maxSignalsValidatorFactory(): ValidationFunc<FormData, ERROR_CODE, unknown> {
  return fieldValidators.numberGreaterThanField({
    than: MIN_VALUE,
    allowEquality: true,
    message: i18n.translate(
      'xpack.securitySolution.ruleManagement.ruleCreation.validation.maxSignals.greaterThanError',
      {
        values: { min: MIN_VALUE },
        defaultMessage: 'Max alerts must be greater than {min}.',
      }
    ),
  });
}
