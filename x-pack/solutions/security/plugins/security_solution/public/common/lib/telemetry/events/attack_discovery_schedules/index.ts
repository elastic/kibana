/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedulesTelemetryEvent } from './types';
import { AttackDiscoverySchedulesEventTypes } from './types';

export const attackDiscoverySchedulesCreateSuccessEvent: AttackDiscoverySchedulesTelemetryEvent = {
  eventType: AttackDiscoverySchedulesEventTypes.CreateSuccess,
  schema: {},
};

export const attackDiscoverySchedulesCreateFailedEvent: AttackDiscoverySchedulesTelemetryEvent = {
  eventType: AttackDiscoverySchedulesEventTypes.CreateFailed,
  schema: {},
};

export const attackDiscoverySchedulesUpdateSuccessEvent: AttackDiscoverySchedulesTelemetryEvent = {
  eventType: AttackDiscoverySchedulesEventTypes.UpdateSuccess,
  schema: {},
};

export const attackDiscoverySchedulesUpdateFailedEvent: AttackDiscoverySchedulesTelemetryEvent = {
  eventType: AttackDiscoverySchedulesEventTypes.UpdateFailed,
  schema: {},
};

const statusUpdatedSchema = {
  status: {
    type: 'keyword',
    _meta: { description: 'The new status applied to the schedule', optional: false },
  },
} as const;

export const attackDiscoverySchedulesStatusUpdateSuccessEvent: AttackDiscoverySchedulesTelemetryEvent =
  {
    eventType: AttackDiscoverySchedulesEventTypes.StatusUpdateSuccess,
    schema: statusUpdatedSchema,
  };

export const attackDiscoverySchedulesStatusUpdateFailedEvent: AttackDiscoverySchedulesTelemetryEvent =
  {
    eventType: AttackDiscoverySchedulesEventTypes.StatusUpdateFailed,
    schema: statusUpdatedSchema,
  };

export const attackDiscoverySchedulesDeleteSuccessEvent: AttackDiscoverySchedulesTelemetryEvent = {
  eventType: AttackDiscoverySchedulesEventTypes.DeleteSuccess,
  schema: {},
};

export const attackDiscoverySchedulesDeleteFailedEvent: AttackDiscoverySchedulesTelemetryEvent = {
  eventType: AttackDiscoverySchedulesEventTypes.DeleteFailed,
  schema: {},
};

const bulkStatusUpdatedSchema = {
  status: {
    type: 'keyword',
    _meta: { description: 'The new status applied to the schedules', optional: false },
  },
  count: {
    type: 'integer',
    _meta: { description: 'The number of schedules updated', optional: false },
  },
} as const;

export const attackDiscoverySchedulesBulkStatusUpdateSuccessEvent: AttackDiscoverySchedulesTelemetryEvent =
  {
    eventType: AttackDiscoverySchedulesEventTypes.BulkStatusUpdateSuccess,
    schema: bulkStatusUpdatedSchema,
  };

export const attackDiscoverySchedulesBulkStatusUpdateFailedEvent: AttackDiscoverySchedulesTelemetryEvent =
  {
    eventType: AttackDiscoverySchedulesEventTypes.BulkStatusUpdateFailed,
    schema: bulkStatusUpdatedSchema,
  };

const bulkDeletedSchema = {
  count: {
    type: 'integer',
    _meta: { description: 'The number of schedules deleted', optional: false },
  },
} as const;

export const attackDiscoverySchedulesBulkDeleteSuccessEvent: AttackDiscoverySchedulesTelemetryEvent =
  {
    eventType: AttackDiscoverySchedulesEventTypes.BulkDeleteSuccess,
    schema: bulkDeletedSchema,
  };

export const attackDiscoverySchedulesBulkDeleteFailedEvent: AttackDiscoverySchedulesTelemetryEvent =
  {
    eventType: AttackDiscoverySchedulesEventTypes.BulkDeleteFailed,
    schema: bulkDeletedSchema,
  };

export const attackDiscoverySchedulesTelemetryEvents = [
  attackDiscoverySchedulesCreateSuccessEvent,
  attackDiscoverySchedulesCreateFailedEvent,
  attackDiscoverySchedulesUpdateSuccessEvent,
  attackDiscoverySchedulesUpdateFailedEvent,
  attackDiscoverySchedulesStatusUpdateSuccessEvent,
  attackDiscoverySchedulesStatusUpdateFailedEvent,
  attackDiscoverySchedulesDeleteSuccessEvent,
  attackDiscoverySchedulesDeleteFailedEvent,
  attackDiscoverySchedulesBulkStatusUpdateSuccessEvent,
  attackDiscoverySchedulesBulkStatusUpdateFailedEvent,
  attackDiscoverySchedulesBulkDeleteSuccessEvent,
  attackDiscoverySchedulesBulkDeleteFailedEvent,
];

export * from './types';
