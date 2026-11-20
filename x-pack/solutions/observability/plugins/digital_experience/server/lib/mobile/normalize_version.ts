/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The marketing version of a `service.version`: Android `versionName (versionCode)` and iOS
 * `1.2.3+45` or `1.2.3 (45)` drop their build, so one release isn't split in two.
 */
export const normalizeVersion = (version: string): string =>
  version
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\+.*$/, '')
    .trim();
