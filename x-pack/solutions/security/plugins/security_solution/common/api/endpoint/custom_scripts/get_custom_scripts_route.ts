/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { isActionSupportedByAgentType } from '../../../endpoint/service/response_actions/is_response_action_supported';
import { AgentTypeSchemaLiteral } from '..';

export const CustomScriptsRequestSchema = {
  query: schema.object(
    {
      agentType: schema.maybe(
        schema.oneOf(
          // @ts-expect-error TS2769: No overload matches this call
          AgentTypeSchemaLiteral,
          { defaultValue: 'endpoint' }
        )
      ),
    },
    {
      validate: (queryOptions) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (!isActionSupportedByAgentType(queryOptions.agentType!, 'runscript', 'manual')) {
          return `Agent type [${queryOptions.agentType}] does not support 'runscript' response action`;
        }
      },
    }
  ),
};

export type CustomScriptsRequestQueryParams = TypeOf<typeof CustomScriptsRequestSchema.query>;
