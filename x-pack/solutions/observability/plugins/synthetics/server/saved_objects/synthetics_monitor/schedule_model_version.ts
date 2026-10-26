/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';
import { ScheduleUnit } from '../../../common/runtime_types';
import { SCHEDULE_INTERVAL_FIELD, scheduleToSeconds } from '../../../common/lib/schedule_to_time';
import { monitorCreateSchema, monitorForwardCompatibilitySchema } from './monitor_attribute_schema';

interface ScheduleAttributes {
  schedule?: {
    number?: string;
    unit?: string;
  };
}

export const backfillScheduleInterval: SavedObjectModelDataBackfillFn<
  ScheduleAttributes,
  { schedule_interval_seconds?: number }
> = (document) => {
  const schedule = document.attributes.schedule;
  if (!schedule?.number) {
    return { attributes: {} };
  }
  // A missing unit is minutes. Older monitors stored the number without a unit.
  let unit: ScheduleUnit | undefined;
  if (schedule.unit === ScheduleUnit.SECONDS) {
    unit = ScheduleUnit.SECONDS;
  } else if (schedule.unit === ScheduleUnit.MINUTES || schedule.unit == null) {
    unit = ScheduleUnit.MINUTES;
  }
  if (!unit) {
    return { attributes: {} };
  }
  return {
    attributes: {
      [SCHEDULE_INTERVAL_FIELD]: scheduleToSeconds({
        number: schedule.number,
        unit,
      }),
    },
  };
};

const scheduleIntervalProperty = {
  [SCHEDULE_INTERVAL_FIELD]: schema.maybe(schema.number({ min: 0 })),
};

export const scheduleIntervalModelVersion: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        [SCHEDULE_INTERVAL_FIELD]: { type: 'integer' },
      },
    },
    {
      type: 'data_backfill',
      backfillFn: backfillScheduleInterval,
    },
  ],
  schemas: {
    create: monitorCreateSchema.extends(scheduleIntervalProperty),
    forwardCompatibility: monitorForwardCompatibilitySchema.extends(scheduleIntervalProperty),
  },
};
