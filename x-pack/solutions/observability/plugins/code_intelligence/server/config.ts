/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

import { DEFAULT_SETTINGS_INDEX } from '../common/repository_settings';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  catalogIndex: schema.string({
    defaultValue: 'code-intelligence-catalog',
    minLength: 1,
    maxLength: 255,
  }),
  findingsIndex: schema.string({
    defaultValue: 'code-intelligence-findings',
    minLength: 1,
    maxLength: 255,
  }),
  settingsIndex: schema.string({
    defaultValue: DEFAULT_SETTINGS_INDEX,
    minLength: 1,
    maxLength: 255,
  }),
  workflowConnectorId: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
  github: schema.object({
    /** Interim Git credential for private GitHub remotes until connector-backed credentials land. */
    token: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
  }),
});

export type CodeIntelligenceConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CodeIntelligenceConfig> = {
  schema: configSchema,
  exposeToBrowser: {},
  exposeToUsage: { github: { token: false } },
};
