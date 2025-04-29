/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormSchema } from '../../../../shared_imports';
import { FIELD_TYPES, fieldValidators } from '../../../../shared_imports';

export const formSchema: FormSchema = {
  title: {
    type: FIELD_TYPES.TEXT,
    validations: [
      {
        validator: fieldValidators.emptyField(''),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [],
  },
};
