/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import { toDuration } from '../../../../utils/slo/duration';

export const getTimeRange = (slo: SLOWithSummaryResponse): TimeRange => {
  if (slo.timeWindow.type === 'calendarAligned') {
    const now = moment();
    const duration = toDuration(slo.timeWindow.duration);
    const unit = duration.unit === 'w' ? 'isoWeek' : 'month';
    return {
      from: moment.utc(now).startOf(unit).toISOString(),
      to: moment.utc(now).endOf(unit).toISOString(),
      mode: 'absolute' as const,
    };
  }
  return {
    from: `now-${slo.timeWindow.duration}`,
    to: 'now',
    mode: 'relative' as const,
  };
};
