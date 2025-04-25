/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unset } from 'lodash';

export const removeExtraFieldsFromTelemetryStats = (stats: any) => {
  Object.entries(stats).forEach(([, value]: [unknown, any]) => {
    value.forEach((entry: any, i: number) => {
      entry.forEach((_e: any, j: number) => {
        unset(value, `[${i}][${j}].time_executed_in_ms`);
        unset(value, `[${i}][${j}].start_time`);
        unset(value, `[${i}][${j}].end_time`);
        unset(value, `[${i}][${j}].cluster_uuid`);
        unset(value, `[${i}][${j}].cluster_name`);
        unset(value, `[${i}][${j}].license`);
      });
    });
  });
};
