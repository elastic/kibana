/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Not a valid flag key (`FLAG_KEY_PATTERN` must start with a letter or digit). */
export const CREATE_FLAG_ID = '_new';

export const paths = {
  flags: '/flags',
  createFlag: `/flags/${CREATE_FLAG_ID}`,
  flag: (key: string) => `/flags/${encodeURIComponent(key)}`,
  apps: '/apps',
  app: (key: string) => `/apps/${encodeURIComponent(key)}`,
  environments: '/environments',
};
