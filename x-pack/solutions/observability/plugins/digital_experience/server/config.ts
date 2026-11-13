/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const digitalExperienceConfig = schema.object({});

export const config: PluginConfigDescriptor = {
  schema: digitalExperienceConfig,
  deprecations: ({ unused }) => [unused('enabled', { level: 'warning' })],
};

export type DigitalExperienceConfig = TypeOf<typeof digitalExperienceConfig>;
