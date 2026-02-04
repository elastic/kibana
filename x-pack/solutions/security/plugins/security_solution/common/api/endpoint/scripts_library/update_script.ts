/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  ScriptDescriptionSchema,
  ScriptExampleSchema,
  ScriptFileSchema,
  ScriptInstructionsSchema,
  ScriptNameSchema,
  ScriptPathToExecutableSchema,
  ScriptPlatformSchema,
  ScriptRequiresInputSchema,
  ScriptTagsSchema,
} from './common';
import type { DeepMutable } from '../../../endpoint/types';
import { validateNonEmptyString } from '../schema_utils';

export const PatchUpdateScriptRequestSchema = {
  body: schema.object(
    {
      name: schema.maybe(ScriptNameSchema),
      platform: schema.maybe(ScriptPlatformSchema),
      file: schema.maybe(ScriptFileSchema),
      requiresInput: schema.maybe(ScriptRequiresInputSchema),
      description: schema.maybe(ScriptDescriptionSchema),
      instructions: schema.maybe(ScriptInstructionsSchema),
      example: schema.maybe(ScriptExampleSchema),
      pathToExecutable: schema.maybe(ScriptPathToExecutableSchema),
      tags: schema.maybe(ScriptTagsSchema),
      version: schema.maybe(schema.string({ minLength: 1, validate: validateNonEmptyString })),
    },
    {
      validate: ({ version, ...updates }) => {
        if (Object.keys(updates).length === 0) {
          return 'At least one field must be defined for update';
        }
      },
    }
  ),
  params: schema.object({
    script_id: schema.string({ validate: validateNonEmptyString }),
  }),
};

export type PatchUpdateRequestParams = DeepMutable<
  TypeOf<typeof PatchUpdateScriptRequestSchema.params>
>;
export type PatchUpdateRequestBody = DeepMutable<
  TypeOf<typeof PatchUpdateScriptRequestSchema.body>
>;
