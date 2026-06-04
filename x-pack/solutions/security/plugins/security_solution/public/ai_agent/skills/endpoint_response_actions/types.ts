/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ActionType = 'isolate' | 'unisolate';

export const ACTION_TYPES: readonly ActionType[] = ['isolate', 'unisolate'] as const;

export interface HostRef {
  hostName: string;
  agentId: string;
  isIsolated: boolean;
}

export interface ActionIntent {
  type: ActionType;
  hostName: string;
  rawInput?: string;
}

export interface ActionResult {
  actionId: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  timestamp: string;
}

export interface PendingActionState {
  actionId: string;
  status: 'pending' | 'completed' | 'failed';
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/** Valid values for an action result status. */
const ACTION_RESULT_STATUSES = ['pending', 'completed', 'failed'] as const;

/** Type guard that narrows an unknown value to {@link ActionType}. */
export const isActionType = (value: unknown): value is ActionType =>
  typeof value === 'string' && (ACTION_TYPES as readonly string[]).includes(value);

/** Type guard that narrows an unknown value to {@link HostRef}. */
export const isHostRef = (value: unknown): value is HostRef =>
  typeof value === 'object' &&
  value !== null &&
  'hostName' in value &&
  typeof (value as Record<string, unknown>).hostName === 'string' &&
  'agentId' in value &&
  typeof (value as Record<string, unknown>).agentId === 'string' &&
  'isIsolated' in value &&
  typeof (value as Record<string, unknown>).isIsolated === 'boolean';

/** Type guard that narrows an unknown value to {@link ActionIntent}. */
export const isActionIntent = (value: unknown): value is ActionIntent =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  isActionType((value as Record<string, unknown>).type) &&
  'hostName' in value &&
  typeof (value as Record<string, unknown>).hostName === 'string' &&
  (!('rawInput' in value) || typeof (value as Record<string, unknown>).rawInput === 'string');

/** Type guard that narrows an unknown value to {@link ActionResult}. */
export const isActionResult = (value: unknown): value is ActionResult =>
  typeof value === 'object' &&
  value !== null &&
  'actionId' in value &&
  typeof (value as Record<string, unknown>).actionId === 'string' &&
  'status' in value &&
  typeof (value as Record<string, unknown>).status === 'string' &&
  (ACTION_RESULT_STATUSES as readonly string[]).includes((value as Record<string, unknown>).status as string) &&
  'timestamp' in value &&
  typeof (value as Record<string, unknown>).timestamp === 'string' &&
  (!('errorMessage' in value) ||
    typeof (value as Record<string, unknown>).errorMessage === 'string');

/** Type guard that narrows an unknown value to {@link PendingActionState}. */
export const isPendingActionState = (value: unknown): value is PendingActionState =>
  typeof value === 'object' &&
  value !== null &&
  'actionId' in value &&
  typeof (value as Record<string, unknown>).actionId === 'string' &&
  'status' in value &&
  typeof (value as Record<string, unknown>).status === 'string' &&
  (ACTION_RESULT_STATUSES as readonly string[]).includes((value as Record<string, unknown>).status as string);
