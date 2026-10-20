/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EventFlyout } from '../../../components/entities/significant_event/event_flyout';
import { useFetchEventById } from '../../../data/significant_events/use_fetch_event_by_id';
import { useSignificantEventsList } from '../../../data/significant_events/use_significant_events_list';
import { useKibana } from '../../../hooks/use_kibana';
import type { DetectionTimeRange } from '../use_detection_time_range';
import { EventsFilters } from './events_filters';
import { EventsTable } from './events_table';
import {
  CLEAR_FILTERS_LABEL,
  EMPTY_BODY,
  EMPTY_TITLE,
  EVENT_NOT_FOUND_TOAST_TITLE,
} from './translations';
import { useEventsUrlState } from './use_events_url_state';

const DEFAULT_PAGE_SIZE = 25;

export const EventsTab = ({
  timeRange,
  onTimeRangeChange,
  onRefresh,
}: {
  timeRange: DetectionTimeRange;
  onTimeRangeChange: (timeRange: DetectionTimeRange) => void;
  onRefresh: () => void;
}): React.ReactElement => {
  const { notifications } = useKibana().services;
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const titleLinks = useRef(new Map<string, HTMLAnchorElement | HTMLButtonElement | null>());
  const {
    searchValue,
    debouncedSearch,
    status,
    severity,
    page,
    eventId,
    hasFilters,
    onSearchChange,
    setStatus,
    setSeverity,
    setPage,
    openEvent,
    closeEvent,
    clearFilters,
  } = useEventsUrlState();
  const eventsQuery = useSignificantEventsList({
    ...timeRange,
    page,
    perPage,
    search: debouncedSearch,
    status,
    severity,
  });
  const events = eventsQuery.data?.hits ?? [];
  const eventOnPage = eventId ? events.find((event) => event.event_id === eventId) : undefined;
  const eventByIdQuery = useFetchEventById(eventId, {
    enabled: Boolean(eventId) && !eventOnPage && !eventsQuery.isLoading,
  });
  const openEventData = eventOnPage ?? eventByIdQuery.data ?? undefined;

  useEffect(() => {
    if (
      eventId &&
      !eventOnPage &&
      !eventsQuery.isLoading &&
      eventByIdQuery.isSuccess &&
      eventByIdQuery.data === null
    ) {
      notifications.toasts.addWarning({ title: EVENT_NOT_FOUND_TOAST_TITLE });
      closeEvent();
    }
  }, [
    closeEvent,
    eventByIdQuery.data,
    eventByIdQuery.isSuccess,
    eventId,
    eventOnPage,
    eventsQuery.isLoading,
    notifications.toasts,
  ]);

  const handlePageChange = useCallback(
    (nextPage: number, nextPerPage: number) => {
      if (nextPerPage !== perPage) {
        setPerPage(nextPerPage);
        setPage(1);
        return;
      }
      setPage(nextPage);
    },
    [perPage, setPage]
  );

  const handleCloseFlyout = useCallback(() => {
    const titleLink = eventId ? titleLinks.current.get(eventId) : undefined;
    closeEvent();
    window.requestAnimationFrame(() => titleLink?.focus());
  }, [closeEvent, eventId]);

  const handleTitleLinkMount = useCallback(
    (mountedEventId: string, element: HTMLAnchorElement | HTMLButtonElement | null) => {
      titleLinks.current.set(mountedEventId, element);
    },
    []
  );

  return (
    <>
      <EventsFilters
        timeRange={timeRange}
        searchValue={searchValue}
        status={status}
        severity={severity}
        onTimeRangeChange={onTimeRangeChange}
        onRefresh={() => {
          void eventsQuery.refetch();
          onRefresh();
        }}
        onSearchChange={onSearchChange}
        onStatusChange={setStatus}
        onSeverityChange={setSeverity}
      />
      <EuiSpacer size="m" />
      {!eventsQuery.isLoading && eventsQuery.data && events.length === 0 ? (
        <EuiEmptyPrompt
          data-test-subj="nightshiftDetectionEventsEmpty"
          iconType="search"
          title={<h2>{EMPTY_TITLE}</h2>}
          body={<p>{EMPTY_BODY}</p>}
          actions={
            hasFilters ? (
              <EuiButton onClick={clearFilters} data-test-subj="nightshiftDetectionEventsClear">
                {CLEAR_FILTERS_LABEL}
              </EuiButton>
            ) : undefined
          }
        />
      ) : (
        <EventsTable
          events={events}
          total={eventsQuery.data?.total ?? 0}
          page={page}
          perPage={perPage}
          isLoading={eventsQuery.isFetching}
          selectedEventId={eventId}
          onEventClick={(event: SignificantEventResponse) => openEvent(event.event_id)}
          onPageChange={handlePageChange}
          onTitleLinkMount={handleTitleLinkMount}
        />
      )}
      {openEventData ? <EventFlyout event={openEventData} onClose={handleCloseFlyout} /> : null}
    </>
  );
};
