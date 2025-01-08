/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const AutomatedActionListRequestSchema = {
  query: schema.object({
    alertIds: schema.arrayOf(schema.string({ minLength: 1 }), {
      minSize: 1,
      validate: (alertIds) => {
        if (alertIds.map((v) => v.trim()).some((v) => !v.length)) {
          return 'alertIds cannot contain empty strings';
        }
      },
    }),
  }),
};

export type EndpointAutomatedActionListRequestQuery = TypeOf<
  typeof AutomatedActionListRequestSchema.query
>;

const AutomatedActionResponseRequestSchema = {
  query: schema.object({
    expiration: schema.string(),
    actionId: schema.string(),
    agent: schema.object({
      id: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
    }),
  }),
};

export type EndpointAutomatedActionResponseRequestQuery = TypeOf<
  typeof AutomatedActionResponseRequestSchema.query
>;
