/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A field's value as the session summaries keep it: trimmed, and empty or `null` as missing. */
export const cleanedValue = (field: string): string =>
  `CASE(TRIM(TO_STRING(${field})) IN ("", "null"), null, TRIM(TO_STRING(${field})))`;
