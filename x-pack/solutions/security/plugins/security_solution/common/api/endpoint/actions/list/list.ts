/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_STATUS,
  RESPONSE_ACTION_TYPE,
} from '../../../../endpoint/service/response_actions/constants';
import { ENDPOINT_DEFAULT_PAGE_SIZE } from '../../../../endpoint/constants';
import { agentTypesSchema } from '../common/base';

const commandsSchema = schema.enum(RESPONSE_ACTION_API_COMMANDS_NAMES);

const statusesSchema = {
  schema: schema.enum(RESPONSE_ACTION_STATUS),
  options: { minSize: 1, maxSize: RESPONSE_ACTION_STATUS.length },
};

const actionTypesSchema = {
  schema: schema.enum(RESPONSE_ACTION_TYPE),
  options: { minSize: 1, maxSize: RESPONSE_ACTION_TYPE.length },
};

export const EndpointActionListRequestSchema = {
  query: schema.object({
    agentIds: schema.maybe(
      schema.oneOf([
        schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
        schema.string({ minLength: 1 }),
      ])
    ),
    agentTypes: schema.maybe(
      schema.oneOf([
        schema.arrayOf(agentTypesSchema.schema, agentTypesSchema.options),
        agentTypesSchema.schema,
      ])
    ),
    commands: schema.maybe(
      schema.oneOf([schema.arrayOf(commandsSchema, { minSize: 1 }), commandsSchema])
    ),
    page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
    pageSize: schema.maybe(
      schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE_SIZE, min: 1, max: 10000 })
    ),
    startDate: schema.maybe(schema.string()), // date ISO strings or moment date
    endDate: schema.maybe(schema.string()), // date ISO strings or moment date
    statuses: schema.maybe(
      schema.oneOf([
        schema.arrayOf(statusesSchema.schema, statusesSchema.options),
        statusesSchema.schema,
      ])
    ),
    userIds: schema.maybe(
      schema.oneOf([
        schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
        schema.string({ minLength: 1 }),
      ])
    ),
    withOutputs: schema.maybe(
      schema.oneOf([
        schema.arrayOf(schema.string({ minLength: 1 }), {
          minSize: 1,
          validate: (actionIds) => {
            if (actionIds.map((v) => v.trim()).some((v) => !v.length)) {
              return 'actionIds cannot contain empty strings';
            }
          },
        }),
        schema.string({
          minLength: 1,
          validate: (actionId) => {
            if (!actionId.trim().length) {
              return 'actionId cannot be an empty string';
            }
          },
        }),
      ])
    ),
    // action types
    types: schema.maybe(
      schema.oneOf([
        schema.arrayOf(actionTypesSchema.schema, actionTypesSchema.options),
        actionTypesSchema.schema,
      ])
    ),
  }),
};

export type EndpointActionListRequestQuery = TypeOf<typeof EndpointActionListRequestSchema.query>;
