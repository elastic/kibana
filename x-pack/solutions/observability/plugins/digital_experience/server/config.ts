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
  SESSIONS_DEFAULT_FREQUENCY,
  SESSIONS_MAX_PARTITIONS,
  timeValueSeconds,
} from '../common/sessions';

/** Transforms accept a frequency between 1s and 1h. */
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
    /** How often the sessions transform checks for changed sessions. Longer is cheaper but staler. */
    frequency: schema.string({
      defaultValue: SESSIONS_DEFAULT_FREQUENCY,
      maxLength: 8,
      validate: validateFrequency,
    }),
    /** Number of transforms that split sessions by `session.id` range, to spread the work. */
    partitions: schema.number({
      defaultValue: 1,
      min: 1,
      max: SESSIONS_MAX_PARTITIONS,
      validate: (value) => (Number.isInteger(value) ? undefined : 'must be a whole number'),
    }),
  }),
});

export const config: PluginConfigDescriptor = {
  schema: digitalExperienceConfig,
};

export type DigitalExperienceConfig = TypeOf<typeof digitalExperienceConfig>;
