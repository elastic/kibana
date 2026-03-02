/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type EntityMaintainerTaskStatus = z.infer<typeof EntityMaintainerTaskStatus>;
export const EntityMaintainerTaskStatus = z.enum(['not_started', 'started', 'stopped']);

export type EntityMaintainer = z.infer<typeof EntityMaintainer>;
export const EntityMaintainer = z.object({
  id: z.string(),
  interval: z.string().regex(/[smdh]$/),
  taskStatus: EntityMaintainerTaskStatus,
});

export type HistorySnapshotStatus = z.infer<typeof HistorySnapshotStatus>;
export const HistorySnapshotStatus = z.enum(['started', 'stopped']);

export type HistorySnapshot = z.infer<typeof HistorySnapshot>;
export const HistorySnapshot = z.object({
  status: HistorySnapshotStatus.default('stopped'),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .default('24h'),
  lastExecutionTimestamp: z.string().optional(),
  lastError: z
    .object({
      message: z.string(),
      timestamp: z.string().optional(),
    })
    .optional(),
});

export type GlobalState = z.infer<typeof GlobalState>;
export const GlobalState = z.object({
  entityMaintainers: z.array(EntityMaintainer).default([]),
  historySnapshot: HistorySnapshot,
});
