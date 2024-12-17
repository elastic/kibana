/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFieldRetentionOperator, FieldRetentionOperatorBuilder } from './types';
import { isFieldMissingOrEmpty } from '../painless';

export interface PreferNewestValue extends BaseFieldRetentionOperator {
  operation: 'prefer_newest_value';
}

/**
 * A field retention operator that prefers the newest value of the specified field.
 * If the field is missing or empty, the value from the enrich field is used.
 */
export const preferNewestValueProcessor: FieldRetentionOperatorBuilder<PreferNewestValue> = (
  { field },
  { enrichField }
) => {
  const latestField = `ctx.${field}`;
  const historicalField = `${enrichField}.${field}`;
  return {
    set: {
      if: `(${isFieldMissingOrEmpty(latestField)}) && !(${isFieldMissingOrEmpty(
        `ctx.${historicalField}`
      )})`,
      field,
      value: `{{${historicalField}}}`,
    },
  };
};
