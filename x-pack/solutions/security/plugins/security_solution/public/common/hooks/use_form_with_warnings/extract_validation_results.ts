/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldHook, ValidationError } from '../../../shared_imports';
import type { ValidationResults } from './validation_results';

export function extractValidationResults(
  formFields: Readonly<FieldHook[]>,
  warningValidationCodes: Readonly<string[]>
): ValidationResults {
  const warningValidationCodesSet = new Set(warningValidationCodes);
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const field of formFields) {
    for (const error of field.errors) {
      const path = error.path ?? field.path;

      if (!error.code || !warningValidationCodesSet.has(error.code)) {
        errors.push({ ...error, path });
      } else {
        warnings.push({ ...error, path });
      }
    }
  }

  return {
    errors,
    warnings,
  };
}
