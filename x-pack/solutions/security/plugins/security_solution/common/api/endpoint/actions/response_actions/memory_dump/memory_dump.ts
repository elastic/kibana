/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { DeepMutable } from '../../../../../endpoint/types';
import { BaseActionRequestSchema } from '../../..';

export const MemoryDumpActionRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,
    parameters: schema.oneOf([
      // Kernel memory dump - no additional params needed
      schema.object({
        type: schema.literal('kernel'),
      }),
      // Process memory dump using PID
      schema.object({
        type: schema.literal('process'),
        pid: schema.number({ min: 1 }),
      }),
      // Process memory dump using entity ID
      schema.object({
        type: schema.literal('process'),
        entity_id: schema.string({
          minLength: 1,
          validate: (value) => {
            if (!value.trim().length) {
              return `entity_id cannot be an empty string`;
            }
          },
        }),
      }),
    ]),
  }),
};

export type MemoryDumpActionRequestBody = DeepMutable<
  TypeOf<typeof MemoryDumpActionRequestSchema.body>
>;
