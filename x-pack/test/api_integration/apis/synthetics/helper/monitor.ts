/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, omitBy } from 'lodash';
import { removeMonitorEmptyValues } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/helper';

export function omitResponseTimestamps(monitor: object) {
  return omitBy(omit(monitor, ['created_at', 'updated_at']), removeMonitorEmptyValues);
}

export function omitEmptyValues(monitor: object) {
  const { url, ...rest } = omit(monitor, ['created_at', 'updated_at', 'form_monitor_type']) as any;

  return omitBy(
    {
      ...rest,
      ...(url ? { url } : {}),
    },
    removeMonitorEmptyValues
  );
}
