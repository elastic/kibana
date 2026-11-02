/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lifecycle state of Significant Events background activity.
 *
 * Persisted on the maintenance saved object. `paused` blocks new background
 * activity; `enabled` allows it. Unknown persisted strings are normalised to
 * {@link DEFAULT_MAINTENANCE_STATE}.
 */
export type SignificantEventsMaintenanceState = 'enabled' | 'paused';

/** State assumed when no maintenance document has been persisted yet. */
export const DEFAULT_MAINTENANCE_STATE: SignificantEventsMaintenanceState = 'enabled';

/** Type guard narrowing an arbitrary persisted string to a known state. */
export const isMaintenanceState = (value: string): value is SignificantEventsMaintenanceState =>
  value === 'enabled' || value === 'paused';

/** Whether the given state blocks new background activity. */
export const stateBlocksNewActivity = (state: SignificantEventsMaintenanceState): boolean =>
  state === 'paused';
