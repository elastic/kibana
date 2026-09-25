/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantEvent,
  SignificantEventResponse,
  Severity,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import type {
  CommonSearchOptions,
  PaginatedResponse,
  PaginatedSearchOptions,
} from '../query_utils';

/**
 * Filters shared by every "latest current state" read path, whether backed by `EventClient`
 * (`EVENTS_DATA_STREAM`) or `RuleEventsClient` (`.rule-events`, gated by
 * `SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ`).
 */
export interface EventsFilterOptions {
  status?: SignificantEventStatus[];
  severity?: Severity[];
  stream?: string[];
  search?: string;
  eventIds?: string[];
  ruleUuids?: string[];
  topologyFeatureIds?: string[];
}

export type EventsPaginatedSearchOptions = PaginatedSearchOptions & EventsFilterOptions;

/**
 * Read-only surface both `EventClient` and `RuleEventsClient` implement, so agent-side read call
 * sites (`event_search`, `event_write`'s dedup scan, `attach_investigation`, SML) can depend on
 * this interface instead of a concrete client and stay correct regardless of
 * `SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ`. Write-only surface (`bulkCreate`, `emitTrigger`,
 * `findByEventUuid`) is intentionally excluded — `RuleEventsClient` is read-only and
 * `event_uuid` is not a real `.rule-events` field (see `RuleEventsClient` doc comment) — callers
 * needing those must keep a separate `EventClient` obtained via `getEventClient()`.
 */
export interface SignificantEventsReadClient {
  findLatestPaginated(
    options?: EventsPaginatedSearchOptions
  ): Promise<PaginatedResponse<SignificantEventResponse>>;
  findLatestByCurrentStatePaginated(
    options: EventsPaginatedSearchOptions
  ): Promise<PaginatedResponse<SignificantEventResponse>>;
  findLatestActive(
    options: CommonSearchOptions & { streamNames?: string[]; ruleUuids?: string[] }
  ): Promise<{ hits: SignificantEvent[] }>;
  findByEventId(eventId: string): Promise<{ hits: SignificantEventResponse[] }>;
}
