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
  enabled: schema.boolean({ defaultValue: true }),
  analytics: schema.object({
    generation: schema.object({
      /** Whether a model may write questions and dashboards for the user's event sources. */
      enabled: schema.boolean({ defaultValue: true }),
      /** When false, the model is told field names and types only; no document value is read for it. */
      sampleValues: schema.boolean({ defaultValue: true }),
      /** A connector or inference endpoint to use instead of Agent Builder's default model. */
      connectorId: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
    }),
  }),
});

export type SearchHomepageConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<SearchHomepageConfig> = {
  schema: configSchema,
};
