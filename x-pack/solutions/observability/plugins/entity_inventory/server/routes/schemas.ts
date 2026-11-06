/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_PLAN_ROWS } from '../inventory/executor';

/**
 * Local copy of `ENTITY_DEFINITION_TYPE_PATTERN` and `ENTITY_DEFINITION_TYPE_MAX_LENGTH` from
 * x-pack/platform/plugins/shared/entity_store/common/domain/definitions/entity_schema.ts, which the
 * entity store does not export from its public entry point. Keep both in sync with that file.
 */
const TYPE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const TYPE_NAME_MAX_LENGTH = 64;

// An ISO 8601 instant with a numeric offset and nanosecond precision is 35 characters long.
const INSTANT_MAX_LENGTH = 64;

/** Every plan asks for one row more than the request, so a request may ask for at most `MAX_PLAN_ROWS - 1`. */
export const MAX_LIST_LIMIT = MAX_PLAN_ROWS - 1;

export const typeNameSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(TYPE_NAME_MAX_LENGTH)
    .regex(
      TYPE_NAME_PATTERN,
      'type must start with a lowercase letter and use lowercase letters, digits and single ".", "_" or "-" separators'
    )
);

/** Path params for routes that name one entity type, such as `list` and `_count`. */
export const typePathParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({ type: typeNameSchema }),
  })
);

// A date and time with `Z` or a numeric offset, so every bound names one instant.
const instantSchema = z.iso.datetime({ offset: true }).max(INSTANT_MAX_LENGTH);

/** Path and body of `POST /internal/entity_inventory/entities/{type}/list`. */
export const listParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({ type: typeNameSchema }),
    body: z
      .object({
        from: instantSchema,
        to: instantSchema,
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).default(MAX_LIST_LIMIT),
      })
      .refine(({ from, to }) => Date.parse(from) < Date.parse(to), {
        message: 'from must be earlier than to',
      }),
  })
);
