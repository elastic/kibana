/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Local copy of `ENTITY_DEFINITION_TYPE_PATTERN` and `ENTITY_DEFINITION_TYPE_MAX_LENGTH` from
 * x-pack/platform/plugins/shared/entity_store/common/domain/definitions/entity_schema.ts, which the
 * entity store does not export from its public entry point. Keep both in sync with that file.
 */
const TYPE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const TYPE_NAME_MAX_LENGTH = 64;

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

/** Path params for routes that name one entity type, such as `_list` and `_count`. */
export const typePathParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({ type: typeNameSchema }),
  })
);
