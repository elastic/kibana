/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/es-query';
import { z } from '@kbn/zod';

import { getDefaultQuery } from '../../helpers';

const querySchema = z.object({
  query: z.union([z.string(), z.object({}).catchall(z.unknown())]),
  language: z.string(),
});

export const deserializeQuery = (value: string): Query => {
  try {
    return querySchema.parse(JSON.parse(value));
  } catch {
    return getDefaultQuery();
  }
};
