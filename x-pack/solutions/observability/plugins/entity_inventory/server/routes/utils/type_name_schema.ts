/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_DEFINITION_TYPE_MAX_LENGTH,
  ENTITY_DEFINITION_TYPE_PATTERN,
} from '@kbn/entity-store/common';
import { z, lazySchema } from '@kbn/zod/v4';

export const typeNameSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(ENTITY_DEFINITION_TYPE_MAX_LENGTH)
    .regex(
      ENTITY_DEFINITION_TYPE_PATTERN,
      'type must start with a lowercase letter and use lowercase letters, digits and single ".", "_" or "-" separators'
    )
);
