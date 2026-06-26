/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum AttackDiscoverySchedulesEventTypes {
  CreateSuccess = 'Attack Discovery Schedules Create Success',
  CreateFailed = 'Attack Discovery Schedules Create Failed',
  UpdateSuccess = 'Attack Discovery Schedules Update Success',
  UpdateFailed = 'Attack Discovery Schedules Update Failed',
  StatusUpdateSuccess = 'Attack Discovery Schedules Status Update Success',
  StatusUpdateFailed = 'Attack Discovery Schedules Status Update Failed',
  DeleteSuccess = 'Attack Discovery Schedules Delete Success',
  DeleteFailed = 'Attack Discovery Schedules Delete Failed',
  BulkStatusUpdateSuccess = 'Attack Discovery Schedules Bulk Status Update Success',
  BulkStatusUpdateFailed = 'Attack Discovery Schedules Bulk Status Update Failed',
  BulkDeleteSuccess = 'Attack Discovery Schedules Bulk Delete Success',
  BulkDeleteFailed = 'Attack Discovery Schedules Bulk Delete Failed',
}

interface StatusUpdatedParams {
  status: 'enabled' | 'disabled';
}

interface BulkStatusUpdatedParams {
  status: 'enabled' | 'disabled';
  count: number;
}

interface BulkDeletedParams {
  count: number;
}

export interface AttackDiscoverySchedulesTelemetryEventsMap {
  [AttackDiscoverySchedulesEventTypes.CreateSuccess]: Record<string, never>;
  [AttackDiscoverySchedulesEventTypes.CreateFailed]: Record<string, never>;
  [AttackDiscoverySchedulesEventTypes.UpdateSuccess]: Record<string, never>;
  [AttackDiscoverySchedulesEventTypes.UpdateFailed]: Record<string, never>;
  [AttackDiscoverySchedulesEventTypes.StatusUpdateSuccess]: StatusUpdatedParams;
  [AttackDiscoverySchedulesEventTypes.StatusUpdateFailed]: StatusUpdatedParams;
  [AttackDiscoverySchedulesEventTypes.DeleteSuccess]: Record<string, never>;
  [AttackDiscoverySchedulesEventTypes.DeleteFailed]: Record<string, never>;
  [AttackDiscoverySchedulesEventTypes.BulkStatusUpdateSuccess]: BulkStatusUpdatedParams;
  [AttackDiscoverySchedulesEventTypes.BulkStatusUpdateFailed]: BulkStatusUpdatedParams;
  [AttackDiscoverySchedulesEventTypes.BulkDeleteSuccess]: BulkDeletedParams;
  [AttackDiscoverySchedulesEventTypes.BulkDeleteFailed]: BulkDeletedParams;
}

export interface AttackDiscoverySchedulesTelemetryEvent {
  eventType: AttackDiscoverySchedulesEventTypes;
  schema: RootSchema<
    AttackDiscoverySchedulesTelemetryEventsMap[AttackDiscoverySchedulesEventTypes]
  >;
}
