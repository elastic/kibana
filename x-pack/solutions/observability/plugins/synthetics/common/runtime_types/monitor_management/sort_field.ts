/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { ConfigKey } from '../../constants/monitor_management';

export const MonitorSortFieldSchema = z
  .enum([
    'enabled',
    'status',
    'updated_at',
    'created_at',
    'urls',
    `${ConfigKey.NAME}.keyword` as 'name.keyword',
    `${ConfigKey.TAGS}.keyword` as 'tags.keyword',
    `${ConfigKey.PROJECT_ID}.keyword` as 'project_id.keyword',
    `${ConfigKey.MONITOR_TYPE}.keyword` as 'type.keyword',
    `${ConfigKey.SCHEDULE}.keyword` as 'schedule.keyword',
    ConfigKey.JOURNEY_ID,
  ])
  .optional();

export type MonitorListSortField = z.infer<typeof MonitorSortFieldSchema>;

/** Sort fields the overview status route actually applies in `sortConfigs`. */
export const OverviewStatusSortFieldSchema = z
  .enum([
    'status',
    'updated_at',
    'created_at',
    'urls',
    `${ConfigKey.NAME}.keyword` as 'name.keyword',
    `${ConfigKey.MONITOR_TYPE}.keyword` as 'type.keyword',
  ])
  .optional();
