/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SEVERITY_OPTIONS, SIGNIFICANT_EVENT_STATUS_OPTIONS } from '@kbn/significant-events-schema';
import type { Severity, SignificantEventStatus } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENTS_TAB } from '../../../../../common';
import { useSignificantEventsAppParams } from '../../../../hooks/use_significant_events_app_params';
import { useSignificantEventsAppRouter } from '../../../../hooks/use_significant_events_app_router';

export const DEFAULT_SIGNIFICANT_EVENT_STATUS_FILTER: SignificantEventStatus[] = ['active'];
export const DEFAULT_SIGNIFICANT_EVENT_SEVERITY_FILTER: Severity[] = ['critical', 'high'];

export interface SignificantEventsFilters {
  status: SignificantEventStatus[];
  severity: Severity[];
  stream: string[];
  /** Service Knowledge Indicator feature ids. */
  service: string[];
}

type TabQuery = ReturnType<typeof useSignificantEventsAppParams<'/{tab}'>>['query'];
type ListParam = string | string[] | undefined;

const omitSelectedEvent = (query: TabQuery): Omit<TabQuery, 'selectedEvent'> => {
  const { selectedEvent, ...rest } = query ?? {};
  return rest;
};

/**
 * Absent param = default; present = explicit selection (`key=` decodes to an empty selection).
 * Unknown values are dropped and the order is canonicalised to the option list.
 */
const parseListParam = <T extends string>(
  raw: ListParam,
  options: readonly T[],
  fallback: T[]
): T[] => {
  if (raw === undefined) {
    return fallback;
  }
  const values = castArray(raw);
  return options.filter((option) => values.includes(option));
};

const parseValuesParam = (raw: ListParam): string[] =>
  raw === undefined ? [] : castArray(raw).filter(Boolean);

// `query-string` drops empty arrays, so an empty selection is written as '' (serialised as `key=`).
const encodeListParam = (values: string[]): string | string[] => (values.length ? values : '');

/**
 * URL state for the significant events tab.
 *
 * - `status` / `severity` / `stream` / `service`: the list filters. The URL is the single source of
 *   truth so they survive a reload and follow browser history. Absent `status`/`severity` means the
 *   default selection; `stream` and `service` are omitted when empty.
 * - `selectedEvent`: deep-link context (e.g. from a notification). Filters the list to just
 *   that event and adapts the filter controls to its properties.
 * - `openEvent`: the single source of truth for flyout visibility — the flyout is open iff
 *   this param is present. Deep-link arrival normalizes `openEvent = selectedEvent` so the
 *   flyout opens; closing the flyout removes `openEvent` while keeping `selectedEvent`.
 */
export const useSignificantEventsUrlState = () => {
  const router = useSignificantEventsAppRouter();
  const { query } = useSignificantEventsAppParams('/{tab}');

  const queryRef = useRef(query);
  queryRef.current = query;

  const selectedEventId = query?.selectedEvent;
  const openEventId = query?.openEvent;

  const statusFilter = useMemo(
    () =>
      parseListParam(
        query?.status,
        SIGNIFICANT_EVENT_STATUS_OPTIONS,
        DEFAULT_SIGNIFICANT_EVENT_STATUS_FILTER
      ),
    [query?.status]
  );
  const severityFilter = useMemo(
    () =>
      parseListParam(query?.severity, SEVERITY_OPTIONS, DEFAULT_SIGNIFICANT_EVENT_SEVERITY_FILTER),
    [query?.severity]
  );
  const streamFilter = useMemo(() => parseValuesParam(query?.stream), [query?.stream]);
  const serviceFilter = useMemo(() => parseValuesParam(query?.service), [query?.service]);

  /**
   * Every URL write goes through here so that writes issued in the same tick compose: the ref is
   * updated eagerly instead of waiting for the re-render that follows navigation. Otherwise the
   * deep-link normalization effect and the tab's filter adaptation effect, which both run in the
   * first effects flush when the list is already cached, would each write from the same stale
   * snapshot and the second would drop the first's `openEvent`.
   */
  const write = useCallback(
    (method: 'push' | 'replace', nextQuery: TabQuery) => {
      queryRef.current = nextQuery;
      router[method]('/{tab}', { path: { tab: SIGNIFICANT_EVENTS_TAB }, query: nextQuery });
    },
    [router]
  );

  /**
   * Only the filters present in `partial` are written; untouched params stay as they are in the
   * URL, so absent still means "default". replace (not push): filter edits should not pile up
   * history entries. A filter edit exits the deep-link selection context (drops `selectedEvent`)
   * unless the caller is adapting the filters to that very event. `openEvent` is kept so an edit
   * does not close the flyout while the event is still in the list; a later fetch that drops the
   * event clears it separately.
   */
  const setFilters = useCallback(
    (
      { status, severity, stream, service }: Partial<SignificantEventsFilters>,
      { keepSelectedEvent = false } = {}
    ) => {
      const {
        stream: currentStream,
        service: currentService,
        ...rest
      } = keepSelectedEvent ? queryRef.current ?? {} : omitSelectedEvent(queryRef.current);
      const nextStream = stream ?? parseValuesParam(currentStream);
      const nextService = service ?? parseValuesParam(currentService);
      write('replace', {
        ...rest,
        ...(status ? { status: encodeListParam(status) } : {}),
        ...(severity ? { severity: encodeListParam(severity) } : {}),
        ...(nextStream.length ? { stream: nextStream } : {}),
        ...(nextService.length ? { service: nextService } : {}),
      });
    },
    [write]
  );

  // Removing the params restores the defaults and exits the deep-link selection context.
  const resetFilters = useCallback(() => {
    const {
      status: _status,
      severity: _severity,
      stream: _stream,
      service: _service,
      ...rest
    } = omitSelectedEvent(queryRef.current);
    write('replace', rest);
  }, [write]);

  const openEvent = useCallback(
    (eventId: string) => write('push', { ...(queryRef.current ?? {}), openEvent: eventId }),
    [write]
  );

  const closeEvent = useCallback(() => {
    const { openEvent: _, ...rest } = queryRef.current ?? {};
    write('push', rest);
  }, [write]);

  // replace (not push): clearing is often triggered per keystroke from the search bar, and a
  // history entry per keystroke would make the back button restore the cleared selection.
  // Keep openEvent so a filter/search edit does not close the flyout while the event is still
  // in the list. A later fetch that drops the event clears openEvent separately.
  const clearSelectedEvent = useCallback(
    () => write('replace', omitSelectedEvent(queryRef.current)),
    [write]
  );

  const toggleEvent = useCallback(
    (eventId: string) => {
      if (queryRef.current?.openEvent === eventId) {
        closeEvent();
      } else {
        openEvent(eventId);
      }
    },
    [openEvent, closeEvent]
  );

  // Deep-link arrival: open the flyout by normalizing openEvent = selectedEvent. Runs once per
  // selectedEvent value so closing the flyout (which removes openEvent) is not undone.
  const normalizedForRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedEventId || normalizedForRef.current === selectedEventId) {
      return;
    }
    normalizedForRef.current = selectedEventId;
    if (!queryRef.current?.openEvent) {
      write('replace', { ...(queryRef.current ?? {}), openEvent: selectedEventId });
    }
  }, [selectedEventId, write]);

  return {
    selectedEventId,
    openEventId,
    statusFilter,
    severityFilter,
    streamFilter,
    serviceFilter,
    setFilters,
    resetFilters,
    openEvent,
    closeEvent,
    clearSelectedEvent,
    toggleEvent,
  };
};
