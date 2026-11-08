/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the first value that is present and not empty, used to read a metadata field from the
 * first of several candidate paths.
 */
export const firstValue = (
  ...values: Array<string | string[] | undefined | null>
): string | string[] | undefined =>
  values.find((value) => value !== undefined && value !== null && String(value).length > 0) ??
  undefined;
