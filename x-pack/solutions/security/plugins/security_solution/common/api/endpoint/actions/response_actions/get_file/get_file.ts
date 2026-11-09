/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from '../../common/base';
import { GET_FILE_MAX_PATHS } from '../../../../../endpoint/service/response_actions/constants';

export const EndpointActionGetFileSchema = {
  body: schema.object(
    {
      ...BaseActionRequestSchema,

      parameters: schema.object({
        // Exactly one of `path` or `paths` must be defined (validated below)
        path: schema.maybe(schema.string({ minLength: 1, maxLength: 4096 })),
        // `paths` applies only to the Elastic Defend Endpoint (validated below)
        paths: schema.maybe(
          schema.arrayOf(schema.string({ minLength: 1, maxLength: 4096 }), {
            minSize: 1,
            maxSize: GET_FILE_MAX_PATHS,
          })
        ),
        // `force` applies only to the Elastic Defend Endpoint on Windows (validated below)
        force: schema.maybe(schema.boolean()),
      }),
    },
    {
      validate(bodyContent) {
        const { path, paths } = bodyContent.parameters;

        if (path === undefined && paths === undefined) {
          return '[parameters]: one of [path] or [paths] must be defined';
        }

        if (path !== undefined && paths !== undefined) {
          return '[parameters]: [path] and [paths] cannot be used together';
        }

        if (
          paths !== undefined &&
          bodyContent.agent_type &&
          bodyContent.agent_type !== 'endpoint'
        ) {
          return `[parameters.paths]: is not valid with agent type of ${bodyContent.agent_type}`;
        }

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
