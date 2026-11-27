/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Rejects non-integer numbers, as a `@kbn/config-schema` `validate` option. */
export const validateInteger = (value: number): string | undefined =>
  Number.isInteger(value) ? undefined : 'must be an integer';
