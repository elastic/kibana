/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
  SERVICE_ENVIRONMENT,
} from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';

/** The buckets of an ES|QL chart over its time range, as many as the app's other charts draw. */
export const TIME_BUCKETS = 50;

/**
 * The environment as a `WHERE` condition, as the routes' `environmentFilter` reads it: any of
 * `fields`, or for "Not defined" APM's sentinel in `notDefinedField` or none of `fields` set;
 * none for all environments.
 */
export const esqlEnvironmentCondition = (
  environment: string | undefined,
  fields: readonly string[],
  notDefinedField: string = SERVICE_ENVIRONMENT
): string | undefined => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return undefined;
  }
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return `(${notDefinedField} == ${escapeStringValue(ENVIRONMENT_NOT_DEFINED_VALUE)} OR (${fields
      .map((field) => `${field} IS NULL`)
      .join(' AND ')}))`;
  }
  return `(${fields.map((field) => `${field} == ${escapeStringValue(environment)}`).join(' OR ')})`;
};

/** A field's value as the session summaries keep it: trimmed, and empty or `null` as missing. */
export const cleanedValue = (field: string): string =>
  `CASE(TRIM(TO_STRING(${field})) IN ("", "null"), null, TRIM(TO_STRING(${field})))`;
