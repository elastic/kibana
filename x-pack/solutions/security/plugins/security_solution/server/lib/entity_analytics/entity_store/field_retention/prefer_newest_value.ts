/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRetentionOperatorBuilder } from './types';
import { isFieldMissingOrEmpty } from '../painless';

/**
 * A field retention operator that prefers the newest value of the specified field.
 * If the field is missing or empty, the value from the enrich field is used.
 */
export const preferNewestValueProcessor: FieldRetentionOperatorBuilder = (
  { destination },
  { enrichField }
) => {
  const latestField = `ctx.${destination}`;
  const historicalField = `${enrichField}.${destination}`;
  return {
    set: {
      if: `(${isFieldMissingOrEmpty(latestField)}) && !(${isFieldMissingOrEmpty(
        `ctx.${historicalField}`
      )})`,
      field: destination,
      value: `{{${historicalField}}}`,
    },
  };
};
