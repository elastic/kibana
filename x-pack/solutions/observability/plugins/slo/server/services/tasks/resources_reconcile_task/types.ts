/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';

export interface TaskState {
  cursor?: string;
  lastFullScanAt?: number;
  lastScanCandidates?: number;
  [key: string]: unknown; // If needed for task manager
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const optionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** Reads the reconcile task state, ignoring malformed fields. */
export const parseTaskInstanceState = ({ state }: ConcreteTaskInstance): TaskState => ({
  cursor: optionalString(state?.cursor),
  lastFullScanAt: optionalNumber(state?.lastFullScanAt),
  lastScanCandidates: optionalNumber(state?.lastScanCandidates),
});
