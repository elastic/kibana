/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const AlertConfigSchema = schema.object({
  tls: schema.maybe(
    schema.object({
      enabled: schema.boolean(),
    })
  ),
  status: schema.object({
    enabled: schema.boolean(),
  }),
});
