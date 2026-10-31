/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/task-manager-plugin/server';
import type { RruleSchedule } from '@kbn/task-manager-plugin/server';
import {
  normalizeScheduleSpec,
  type RumReportScheduleInput,
} from '../../common/rum_report_schedule';

const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR'] as const;

export const cadenceToRrule = (spec: RumReportScheduleInput | string): RruleSchedule => {
  const schedule = normalizeScheduleSpec(typeof spec === 'string' ? { cadence: spec } : spec);
  const clock = {
    tzid: schedule.tzid,
    byhour: [schedule.hour],
    byminute: [schedule.minute],
  };

  if (schedule.cadence === 'monthly') {
    return {
      rrule: {
        freq: Frequency.MONTHLY,
        interval: 1,
        bymonthday: [schedule.monthday],
        ...clock,
      },
    };
  }

  if (schedule.cadence === 'daily') {
    return {
      rrule: {
        freq: Frequency.DAILY,
        interval: 1,
        ...clock,
      },
    };
  }

  if (schedule.cadence === 'weekdays') {
    return {
      rrule: {
        freq: Frequency.DAILY,
        interval: 1,
        byweekday: [...WEEKDAYS],
        ...clock,
      },
    };
  }

  return {
    rrule: {
      freq: Frequency.WEEKLY,
      interval: schedule.cadence === 'biweekly' ? 2 : 1,
      byweekday: [schedule.weekday],
      ...clock,
    },
  };
};
