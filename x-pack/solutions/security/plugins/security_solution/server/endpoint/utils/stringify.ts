/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspect } from 'util';

/**
 * Safely traverse some content (object, array, etc) and stringify it
 * @param content
 * @param depth
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stringify = (content: any, depth = 8): string => {
  return inspect(content, { depth });
};
