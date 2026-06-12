/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES, fieldValidators, type FormSchema } from '../../../../../../shared_imports';
import type { RuleTranslationSchema } from './types';
import * as i18n from './translations';

export const schema: FormSchema<RuleTranslationSchema> = {
  ruleName: {
    type: FIELD_TYPES.TEXT,
    label: i18n.NAME_LABEL,
    validations: [
      {
        validator: fieldValidators.emptyField(i18n.NAME_REQUIRED_ERROR_MESSAGE),
      },
    ],
  },
};
