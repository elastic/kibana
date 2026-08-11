/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  ears: schema.object({
    url: schema.maybe(schema.string()),
    ui_enabled: schema.boolean({ defaultValue: false }),
    allow_insecure: schema.boolean({ defaultValue: true }),
  }),
});

export type WorkplaceAIAppConfig = TypeOf<typeof configSchema>;

export type WorkplaceAIEarsConfig = WorkplaceAIAppConfig['ears'];

export const config: PluginConfigDescriptor<WorkplaceAIAppConfig> = {
  exposeToBrowser: {
    ears: true,
  },
  schema: configSchema,
};
