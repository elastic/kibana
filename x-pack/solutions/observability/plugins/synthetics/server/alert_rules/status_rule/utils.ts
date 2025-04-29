/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { EncryptedSyntheticsMonitorAttributes, OverviewPing } from '../../../common/runtime_types';

export const getMonitorToPing = (
  monitor: EncryptedSyntheticsMonitorAttributes,
  locationId: string
) => {
  const location = monitor.locations.find((loc) => loc.id === locationId);
  return {
    monitor: {
      id: monitor.id,
      name: monitor.name,
      type: monitor.type,
    },
    observer: {
      name: location?.id,
      geo: {
        name: location?.label,
      },
    },
    config_id: monitor.config_id,
  } as OverviewPing;
};

export const getIntervalFromTimespan = (timespan: { gte: string; lt: string }) => {
  const start = moment(timespan.gte);
  const end = moment(timespan.lt);
  return end.diff(start, 'seconds');
};
