/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { validateNonEmptyString } from '../../../schema_utils';
import { BaseActionRequestSchema } from '../../common/base';

const IdParameterSchema = {
  id: schema.string({
    minLength: 1,
    maxLength: 50,
    validate: validateNonEmptyString,
  }),
};

const MSDefenderEndpointCancelActionRequestParamsSchema = schema.object(IdParameterSchema);

const EndpointCancelActionRequestParamsSchema = schema.object({
  ...IdParameterSchema,
  force: schema.maybe(schema.boolean()),
});

const CancelActionRequestBodySchema = schema.object({
  ...BaseActionRequestSchema,
  parameters: schema.conditional(
    schema.siblingRef('agent_type'),
    'microsoft_defender_endpoint',
    MSDefenderEndpointCancelActionRequestParamsSchema,
    schema.conditional(
      schema.siblingRef('agent_type'),
      'endpoint',
      EndpointCancelActionRequestParamsSchema,
      schema.never()
    )
  ),
});

export const CancelActionRequestSchema = {
  body: CancelActionRequestBodySchema,
};

export type CancelActionRequestBody = TypeOf<typeof CancelActionRequestSchema.body>;
