/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { DeepMutable } from '../../../endpoint/types';
import {
  ScriptFileSchema,
  ScriptFileTypeSchema,
  ScriptNameSchema,
  ScriptPathToExecutableSchema,
  ScriptPlatformSchema,
  ScriptRequiresInputSchema,
  getScriptsTagSchema,
} from './common';

export const CreateScriptRequestSchema = {
  body: schema.object({
    name: ScriptNameSchema,
    platform: ScriptPlatformSchema,
    file: ScriptFileSchema,
    fileType: ScriptFileTypeSchema,
    requiresInput: schema.maybe(ScriptRequiresInputSchema),
    description: schema.maybe(schema.string()),
    instructions: schema.maybe(schema.string()),
    example: schema.maybe(schema.string()),
    pathToExecutable: schema.conditional(
      schema.siblingRef('fileType'),
      'archive',
      ScriptPathToExecutableSchema,
      schema.never()
    ),
    tags: schema.maybe(getScriptsTagSchema('post')),
  }),
};

export type CreateScriptRequestBody = DeepMutable<TypeOf<typeof CreateScriptRequestSchema.body>>;
