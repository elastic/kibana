/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { ConfigKey } from '../../constants/monitor_management';

const allowedSortFields = new Set([
  'enabled',
  'status',
  'updated_at',
  ConfigKey.NAME,
  `${ConfigKey.NAME}.keyword`,
  ConfigKey.TAGS,
  `${ConfigKey.TAGS}.keyword`,
  ConfigKey.PROJECT_ID,
  ConfigKey.MONITOR_TYPE,
  `${ConfigKey.MONITOR_TYPE}.keyword`,
  ConfigKey.SCHEDULE,
  `${ConfigKey.SCHEDULE}.keyword`,
  ConfigKey.JOURNEY_ID,
]);

function isValidSortField(value: unknown): value is string {
  return typeof value === 'string' && allowedSortFields.has(value);
}

export const MonitorSortFieldSchema = schema.string({
  minLength: 1,
  validate(value) {
    if (!isValidSortField(value)) {
      return `Invalid sort field: ${value}. Allowed fields are: ${Array.from(
        allowedSortFields
      ).join(', ')}`;
    }
  },
});

export type MonitorListSortField = TypeOf<typeof MonitorSortFieldSchema>;
