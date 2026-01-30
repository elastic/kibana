/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';

export const readUtf8File = (filePath: string): string => {
  return fs.readFileSync(filePath, 'utf8');
};

/**
 * Matches the historical behavior used in this directory:
 * `fs.readFileSync(..., 'utf8').split('\n').find(Boolean)`
 *
 * - Splits on `\n` only (preserves any `\r` on CRLF)
 * - Treats whitespace-only lines as "non-empty" (truthy), so JSON.parse may still throw
 */
export const readFirstNonEmptyLineUtf8 = (filePath: string): string | undefined => {
  return readUtf8File(filePath).split('\n').find(Boolean);
};

export const readJsonFromFile = (filePath: string): unknown => {
  return JSON.parse(readUtf8File(filePath));
};
