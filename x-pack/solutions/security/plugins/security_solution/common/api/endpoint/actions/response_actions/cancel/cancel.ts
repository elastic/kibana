/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from '../../common/base';

const CancelActionRequestBodySchema = schema.object({
  ...BaseActionRequestSchema,
  parameters: schema.object({
    id: schema.string({
      minLength: 1,
      validate: (value) => {
        if (!value.trim().length) {
          return 'id cannot be an empty string';
        }
      },
    }),
  }),
});

export const CancelActionRequestSchema = {
  body: CancelActionRequestBodySchema,
};

export type CancelActionRequestBody = TypeOf<typeof CancelActionRequestSchema.body>;
