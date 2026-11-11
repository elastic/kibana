/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Severity,
  SignificantEventResponse,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import type { PaginatedResponse } from './pagination';

/**
 * Investigation progress of an event, read from the investigation of its alert: none, one that is
 * still running, or one that is not.
 */
export const SIGNIFICANT_EVENT_INVESTIGATION_STATES = [
  'not_started',
  'in_progress',
  'completed',
] as const;
export type SignificantEventInvestigationState =
  (typeof SIGNIFICANT_EVENT_INVESTIGATION_STATES)[number];

export const SIGNIFICANT_EVENTS_SORT_FIELDS = [
  'created_at',
  'updated_at',
  'severity',
  'status',
] as const;
export type SignificantEventsSortField = (typeof SIGNIFICANT_EVENTS_SORT_FIELDS)[number];

export const isSignificantEventsSortField = (value: unknown): value is SignificantEventsSortField =>
  SIGNIFICANT_EVENTS_SORT_FIELDS.some((field) => field === value);

export const MAX_SIGNIFICANT_EVENTS_SEARCH_LENGTH = 500;

export const SIGNIFICANT_EVENTS_SORT_ORDERS = ['asc', 'desc'] as const;
export type SignificantEventsSortOrder = (typeof SIGNIFICANT_EVENTS_SORT_ORDERS)[number];

/** The events list: a page of events, each with the state of its investigation. */
export interface SignificantEventsListResponse extends PaginatedResponse<SignificantEventResponse> {
  /** The investigation window was full, so an event with an older investigation reads `not_started`. */
  investigation_window_truncated?: boolean;
}

/** Event counts per filter option. Each dimension ignores its own filter, so options stay comparable. */
export interface SignificantEventsFacets {
  severity: Record<Severity, number>;
  status: Record<SignificantEventStatus, number>;
  /** Absent when the investigation state could not be read. */
  investigation?: Record<SignificantEventInvestigationState, number>;
  investigation_window_truncated?: boolean;
}
