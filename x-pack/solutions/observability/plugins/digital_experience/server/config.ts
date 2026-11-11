/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { SESSIONS_DEFAULT_FREQUENCY, timeValueSeconds } from '../common/sessions';

/** The summaries task runs between every second and every hour. */
export const validateFrequency = (value: string): string | undefined => {
  const seconds = timeValueSeconds(value);
  if (seconds == null) {
    return 'must be a time value such as 30s, 1m or 5m';
  }
  return seconds <= 3600 ? undefined : 'must be between 1s and 1h';
};

const digitalExperienceConfig = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  sessions: schema.object({
    /** How often the summaries task looks for changed sessions. Longer is cheaper but staler. */
    frequency: schema.string({
      defaultValue: SESSIONS_DEFAULT_FREQUENCY,
      maxLength: 8,
      validate: validateFrequency,
    }),
  }),
});

export const config: PluginConfigDescriptor = {
  schema: digitalExperienceConfig,
};

export type DigitalExperienceConfig = TypeOf<typeof digitalExperienceConfig>;
