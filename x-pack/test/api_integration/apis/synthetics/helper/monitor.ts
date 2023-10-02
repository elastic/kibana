/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { secretKeys } from '@kbn/synthetics-plugin/common/constants/monitor_management';

export function omitTimestamps(monitor: object) {
  return omit(monitor, ['created_at', 'updated_at']);
}

export function omitTimestampsAndSecrets(monitor: object) {
  return omit(monitor, ['created_at', 'updated_at', ...secretKeys]);
}
