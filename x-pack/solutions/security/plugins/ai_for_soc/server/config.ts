/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { ConfigType } from '../common/types';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export type ConfigSchemaType = TypeOf<typeof configSchema>;

// Config type validation
export const config: { schema: ConfigSchemaType } & Partial<ConfigType> = {
  schema: configSchema,
}; 