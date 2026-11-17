/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from '../../common/base';

export const EndpointActionGetFileSchema = {
  body: schema.object(
    {
      ...BaseActionRequestSchema,

      parameters: schema.object({
        path: schema.string({ minLength: 1, maxLength: 4096 }),
        // `force` applies only to the Elastic Defend Endpoint on Windows (validated below)
        force: schema.maybe(schema.boolean()),
      }),
    },
    {
      validate(bodyContent) {
        if (
          'force' in bodyContent.parameters &&
          bodyContent.agent_type &&
          bodyContent.agent_type !== 'endpoint'
        ) {
          return `[parameters.force]: is not valid with agent type of ${bodyContent.agent_type}`;
        }
      },
    }
  ),
};

export type ResponseActionGetFileRequestBody = TypeOf<typeof EndpointActionGetFileSchema.body>;
