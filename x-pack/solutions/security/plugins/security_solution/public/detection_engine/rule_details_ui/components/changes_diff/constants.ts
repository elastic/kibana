/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const IGNORED_FIELDS: ReadonlySet<string> = new Set([
  'updated_at',
  'updated_by',
  'created_at',
  'created_by',
  'revision',
  'execution_summary',
  'meta',
]);
