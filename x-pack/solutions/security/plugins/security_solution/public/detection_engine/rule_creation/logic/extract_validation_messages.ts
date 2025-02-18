/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import type { ValidationError } from '../../../shared_imports';

export function extractValidationMessages(
  validationErrors: ValidationError[],
  errorCodeFieldNameMap: Readonly<Record<string, string>>
): string[] {
  return validationErrors.map(
    (x) => `${errorCodeFieldNameMap[x.code ?? ''] ?? capitalize(x.path)}: ${x.message}`
  );
}
