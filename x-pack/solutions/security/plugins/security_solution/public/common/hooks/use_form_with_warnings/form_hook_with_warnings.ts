/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormHook, FormData, ValidationError } from '../../../shared_imports';

export interface FormHookWithWarnings<T extends FormData = FormData, I extends FormData = T>
  extends FormHook<T, I> {
  getValidationWarnings(): ValidationError[];
}
