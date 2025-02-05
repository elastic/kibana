/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore, type Filter } from '@kbn/es-query';
import { z } from '@kbn/zod';

const filtersSchema = z.array(
  z.object({
    $state: z
      .union([
        z.object({
          store: z.nativeEnum(FilterStateStore),
        }),
        z.undefined(),
      ])
      .optional(),
    meta: z.object({}).catchall(z.unknown()),
    query: z.union([z.record(z.string(), z.any()), z.undefined()]).optional(),
  })
);

export type FiltersSchema = z.infer<typeof filtersSchema>;

export const deserializeFilters = (value: string): Filter[] => {
  try {
    return filtersSchema.parse(JSON.parse(value));
  } catch {
    return [];
  }
};
