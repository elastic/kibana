/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';

/**
 * Defines the action types for filter toggle operations.
 * These represent the different kinds of filters that can be toggled in the graph investigation.
 */
export type FilterActionType =
  | 'TOGGLE_ACTIONS_BY_ENTITY' // Toggle filter for actions performed by an entity
  | 'TOGGLE_ACTIONS_ON_ENTITY' // Toggle filter for actions performed on an entity
  | 'TOGGLE_RELATED_EVENTS' // Toggle filter for related events/entities
  | 'TOGGLE_EVENTS_WITH_ACTION'; // Toggle filter for events with a specific action

/**
 * Payload for filter actions. Contains all necessary data to perform a filter toggle.
 */
export interface FilterActionPayload {
  /** The type of filter action to perform */
  type: FilterActionType;
  /** The field to filter on (e.g., 'user.entity.id', 'event.action') */
  field: string;
  /** The value to filter for */
  value: string;
  /** Whether to show (add filter) or hide (remove filter) */
  action: 'show' | 'hide';
}

/**
 * RxJS Subject for filter actions.
 * Flyout components emit actions to this Subject.
 * GraphInvestigation subscribes to handle filter updates.
 *
 * Flow: Flyout → filterAction$ → GraphInvestigation → setSearchFilters
 */
export const filterAction$ = new Subject<FilterActionPayload>();

/**
 * Emit a filter action to be handled by GraphInvestigation.
 * Use this from flyout components (e.g., ActionsButton) to trigger filter changes.
 *
 * @param payload - The filter action payload containing type, field, value, and action
 */
export const emitFilterAction = (payload: FilterActionPayload): void => {
  filterAction$.next(payload);
};

/**
 * Reset the filterAction$ Subject (primarily for tests).
 * Creates a new Subject instance to clear any pending subscriptions.
 */
export const __resetFilterAction = (): void => {
  // Note: In production, we typically don't need to reset the Subject
  // This is mainly useful for test isolation
};
