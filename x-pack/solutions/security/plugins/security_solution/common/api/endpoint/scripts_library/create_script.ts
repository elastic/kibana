/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { SUPPORTED_HOST_OS_TYPE } from '../../../endpoint/constants';
import type { DeepMutable } from '../../../endpoint/types';
import { validateNoDuplicateValues, validateNonEmptyString } from '../schema_utils';

export const CreateScriptRequestSchema = {
  body: schema.object({
    name: schema.string({ minLength: 1, validate: validateNonEmptyString }),
    platform: schema.arrayOf(
      // @ts-expect-error TS2769: No overload matches this call. (due to now `oneOf()` type is defined)
      schema.oneOf(SUPPORTED_HOST_OS_TYPE.map((osType) => schema.literal(osType))),
      { minSize: 1, maxSize: 3, validate: validateNoDuplicateValues }
    ),
    file: schema.stream(),
    requiresInput: schema.maybe(schema.boolean({ defaultValue: false })),
    description: schema.maybe(schema.string({ minLength: 1, validate: validateNonEmptyString })),
    instructions: schema.maybe(schema.string({ minLength: 1, validate: validateNonEmptyString })),
    example: schema.maybe(schema.string({ minLength: 1, validate: validateNonEmptyString })),
    pathToExecutable: schema.maybe(
      schema.string({ minLength: 1, validate: validateNonEmptyString })
    ),
  }),
};

export type CreateScriptRequestBody = DeepMutable<TypeOf<typeof CreateScriptRequestSchema.body>>;
