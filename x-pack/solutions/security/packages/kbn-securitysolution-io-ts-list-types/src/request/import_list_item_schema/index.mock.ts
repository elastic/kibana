/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ImportListItemSchema } from '.';

export const getImportListItemSchemaMock = (): ImportListItemSchema => ({
  file: {},
});

/**
 * This is useful for end to end tests, it will return a buffer given a string array
 * of things to import.
 * @param input Array of strings of things to import
 */
export const getImportListItemAsBuffer = (input: string[]): Buffer => {
  return Buffer.from(input.join('\r\n'));
};
