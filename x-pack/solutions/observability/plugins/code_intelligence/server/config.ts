/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const repositorySchema = schema.object({
  repository: schema.string({ minLength: 3, maxLength: 256 }),
  bareRepositoryPath: schema.string({ minLength: 1, maxLength: 4096 }),
  remoteName: schema.string({ minLength: 1, maxLength: 128 }),
  expectedRemoteUrl: schema.string({ minLength: 1, maxLength: 2048 }),
});

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  catalogIndex: schema.string({
    defaultValue: 'code-intelligence-catalog',
    minLength: 1,
    maxLength: 255,
  }),
  workflowConnectorId: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
  repositories: schema.arrayOf(repositorySchema, { defaultValue: [], maxSize: 32 }),
});

export type CodeIntelligenceConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CodeIntelligenceConfig> = {
  schema: configSchema,
};
