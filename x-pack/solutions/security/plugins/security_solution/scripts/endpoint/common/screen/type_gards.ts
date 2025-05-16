/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Choice } from './types';

/**
 * Type guard that checks if a item is a `Choice`
 *
 * @param item
 */
export const isChoice = (item: string | object): item is Choice => {
  return 'string' !== typeof item && 'key' in item && 'title' in item;
};
