/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { DeepMutable } from '../../../endpoint/types';
import { AgentTypeSchemaLiteral, HostOsTypeSchemaLiteral } from '..';

export const CustomScriptsRequestSchema = {
  query: schema.object({
    agentType: schema.maybe(
      schema.oneOf(
        // @ts-expect-error TS2769: No overload matches this call
        AgentTypeSchemaLiteral,
        {
          defaultValue: 'endpoint',
        }
      )
    ),
    /**
     * Filter for `osType`. Valid values are `'macos', 'windows', 'linux'`.
     * Currently only supported for SentinelOne EDR
     */
    osType: schema.maybe(
      // @ts-expect-error TS2769: No overload matches this call
      schema.oneOf(HostOsTypeSchemaLiteral)
    ),
  }),
};

export type CustomScriptsRequestQueryParams = DeepMutable<
  TypeOf<typeof CustomScriptsRequestSchema.query>
>;
