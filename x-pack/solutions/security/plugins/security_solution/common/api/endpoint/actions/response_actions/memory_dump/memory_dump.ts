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
    parameters: schema.object(
      {
        type: schema.oneOf([schema.literal('process'), schema.literal('kernel')]),
        pid: schema.maybe(schema.number({ min: 1 })),
        entity_id: schema.maybe(
          schema.string({
            minLength: 1,
            validate: (value) => {
              if (!value.trim().length) {
                return `entity_id cannot be an empty string`;
              }
            },
          })
        ),
      },
      {
        validate: (parameters) => {
          if (parameters.type === 'kernel' && (parameters.pid || parameters.entity_id)) {
            return '"pid" and "entity_id" parameters only supported for type of "process"';
          }

          if (parameters.type === 'process') {
            if (!parameters.pid && !parameters.entity_id) {
              return 'Type of "process" requires either "pid" or "entity_id"';
            }

            if (parameters.pid !== undefined && parameters.entity_id !== undefined) {
              return 'Type of "process" cannot have both "pid" and "entity_id"';
            }
          }
        },
      }
    ),
  }),
};

export type MemoryDumpActionRequestBody = DeepMutable<
  TypeOf<typeof MemoryDumpActionRequestSchema.body>
>;
