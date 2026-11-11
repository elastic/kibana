/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiIllustration,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { analyzeMagnifyGlass } from '@elastic/eui-illustrations';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getHttpErrorStatus } from '../../../common/http_error';
import { EventFlyout } from '../../../components/entities/significant_event/event_flyout';
import { useFetchEventById } from '../../../data/significant_events/use_fetch_event_by_id';
import { useSignificantEventsFacets } from '../../../data/significant_events/use_significant_events_facets';
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
  INVESTIGATION_FILTER_ERROR_MESSAGE,
  LIST_ERROR_MESSAGE,
  LIST_ERROR_TITLE,
  RETRY_LABEL,
} from './translations';
import { useEventsUrlState } from './use_events_url_state';

const DEFAULT_PAGE_SIZE = 25;
const HTTP_SERVICE_UNAVAILABLE = 503;

export const EventsTab = ({
  timeRange,
  onTimeRangeChange,
  entities,
  unassigned,
}: {
  timeRange: DetectionTimeRange;
  onTimeRangeChange: (timeRange: DetectionTimeRange) => void;
  entities: string[];
  unassigned: boolean;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useKibana().services;
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const openButtons = useRef(new Map<string, HTMLButtonElement | null>());
  const {
    searchValue,
    searchQuery,
    status,
    severity,
    investigation,
    sort,
    page,
    eventId,
    hasFilters,
    onSearchChange,
    setStatus,
    setSeverity,
    setInvestigation,
    setSort,
    setPage,
    openEvent,
    closeEvent,
    clearFilters,
  } = useEventsUrlState();
  const filters = {
    ...timeRange,
    entities,
    unassigned,
    search: searchQuery,
    status,
    severity,
    investigation,
  };
  const eventsQuery = useSignificantEventsList({
    ...filters,
    page,
    perPage,
    sortField: sort.field,
    sortOrder: sort.order,
  });
  const facetsQuery = useSignificantEventsFacets(filters);
  // Only the 503 from the route means the investigation state is unavailable.
  const isInvestigationStateUnavailable =
    investigation.length > 0 && getHttpErrorStatus(eventsQuery.error) === HTTP_SERVICE_UNAVAILABLE;
  const events = eventsQuery.data?.hits ?? [];
  const lastPage = Math.max(1, Math.ceil((eventsQuery.data?.total ?? 0) / perPage));
  const isPastLastPage = Boolean(eventsQuery.data) && page > lastPage;
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
      // Replace, so Back doesn't return to the dead link.
      closeEvent(true);
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

  // A stale link or a shrinking result set (new time range, an event marked inactive) can leave
  // the URL past the last page.
  useEffect(() => {
    if (isPastLastPage) {
      setPage(lastPage, true);
    }
  }, [isPastLastPage, lastPage, setPage]);

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
    const openButton = eventId ? openButtons.current.get(eventId) : undefined;
    closeEvent();
    window.requestAnimationFrame(() => openButton?.focus());
  }, [closeEvent, eventId]);

  const handleOpenButtonMount = useCallback(
    (mountedEventId: string, element: HTMLButtonElement | null) => {
      openButtons.current.set(mountedEventId, element);
    },
    []
  );

  const isEmpty =
    !eventsQuery.isLoading && eventsQuery.data && events.length === 0 && !isPastLastPage;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-block-size: 100%;
      `}
    >
      {/* EuiFlexGroup grows by default — keep filters from eating the empty-state space. */}
      <div
        css={css`
          flex: 0 0 auto;
        `}
      >
        <EventsFilters
          timeRange={timeRange}
          searchValue={searchValue}
          status={status}
          severity={severity}
          onTimeRangeChange={onTimeRangeChange}
          investigation={investigation}
          facets={facetsQuery.data}
          onInvestigationChange={setInvestigation}
          onSearchChange={onSearchChange}
          onStatusChange={setStatus}
          onSeverityChange={setSeverity}
        />
        <EuiSpacer size="m" />
      </div>
      {eventsQuery.isError && (!eventsQuery.data || eventsQuery.isPreviousData) ? (
        <KbnDangerCallout
          announceOnMount
          title={LIST_ERROR_TITLE}
          text={
            isInvestigationStateUnavailable
              ? INVESTIGATION_FILTER_ERROR_MESSAGE
              : LIST_ERROR_MESSAGE
          }
          size="s"
          data-test-subj="nightshiftDetectionEventsError"
          actionProps={{
            primary: {
              children: RETRY_LABEL,
              iconType: 'refresh',
              onClick: () => void eventsQuery.refetch(),
              'data-test-subj': 'nightshiftDetectionEventsRetryButton',
            },
          }}
        />
      ) : isEmpty ? (
        <div
          css={css`
            display: flex;
            flex: 1 1 auto;
            align-items: center;
            justify-content: center;
            min-block-size: 0;
          `}
        >
          <EuiEmptyPrompt
            data-test-subj="nightshiftDetectionEventsEmpty"
            layout="vertical"
            color="transparent"
            icon={
              <EuiIllustration
                type={analyzeMagnifyGlass}
                alt=""
                css={css`
                  max-inline-size: ${euiTheme.base * 6}px;
                  margin-inline: auto;
                `}
              />
            }
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
        </div>
      ) : (
        <EventsTable
          events={events}
          total={eventsQuery.data?.total ?? 0}
          page={page}
          perPage={perPage}
          sort={sort}
          onSortChange={setSort}
          isLoading={eventsQuery.isFetching}
          selectedEventId={eventId}
          onEventClick={(event: SignificantEventResponse) => openEvent(event.event_id)}
          onPageChange={handlePageChange}
          onOpenButtonMount={handleOpenButtonMount}
        />
      )}
      {openEventData ? <EventFlyout event={openEventData} onClose={handleCloseFlyout} /> : null}
    </div>
  );
};
