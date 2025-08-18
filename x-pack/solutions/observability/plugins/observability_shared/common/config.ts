/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const observabilitySharedConfigSchema = schema.object({
  unsafe: schema.maybe(
    schema.object({
      investigativeExperienceEnabled: schema.maybe(schema.boolean({ defaultValue: false })),
    })
  ),
});

export type ObservabilitySharedConfig = TypeOf<typeof observabilitySharedConfigSchema>;
export type ObservabilitySharedBrowserConfig = Pick<
  TypeOf<typeof observabilitySharedConfigSchema>,
  'unsafe'
>;
