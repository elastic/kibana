/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export interface ConfigSchema {
  responseTimeout: number;
}
export const configSchema = schema.object({
  responseTimeout: schema.number({
    defaultValue: 10 * 60 * 1000, // 10 minutes
  }),
});
