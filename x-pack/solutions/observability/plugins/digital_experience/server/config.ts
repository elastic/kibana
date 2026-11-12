/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  SESSIONS_DEFAULT_CONCURRENCY,
  SESSIONS_DEFAULT_FREQUENCY,
  SESSIONS_FREQUENCY_MAX_LENGTH,
  SESSIONS_MAX_CONCURRENCY,
  validateSessionsConcurrency,
  validateSessionsFrequency,
} from '../common/sessions';

const digitalExperienceConfig = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  // The defaults of the summaries task; settings saved in the app override them.
  sessions: schema.object({
    /** How often the summaries task looks for changed sessions. Longer is cheaper but staler. */
    frequency: schema.string({
      defaultValue: SESSIONS_DEFAULT_FREQUENCY,
      maxLength: SESSIONS_FREQUENCY_MAX_LENGTH,
      validate: validateSessionsFrequency,
    }),
    /**
     * How many summary queries of 5,000 sessions the task runs at once. More finishes busy windows
     * sooner, for more Elasticsearch CPU and about 50 MB more Kibana memory each.
     */
    concurrency: schema.number({
      defaultValue: SESSIONS_DEFAULT_CONCURRENCY,
      min: 1,
      max: SESSIONS_MAX_CONCURRENCY,
      validate: validateSessionsConcurrency,
    }),
  }),
});

export const config: PluginConfigDescriptor = {
  schema: digitalExperienceConfig,
};

export type DigitalExperienceConfig = TypeOf<typeof digitalExperienceConfig>;
