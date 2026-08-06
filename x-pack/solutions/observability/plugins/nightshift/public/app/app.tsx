/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { usePageReady } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from '../hooks/use_kibana';
import { buildNewSignificantEventChatOptions } from '../chat/open_significant_event_in_chat';
import {
  byCriticalityAndUpdatedAtDesc,
  getNeedsActionEvents,
  getResolvedEvents,
} from '../event/significant_event_status';
import { useFetchSignificantEvents } from '../hooks/use_fetch_significant_events';
import { useCloseSignificantEvent } from '../hooks/use_close_significant_event';
import {
  buildBlastRadiusChips,
  filterEventsByBlastRadiusChip,
} from '../landing/blast_radius_chips';
import { BlastRadiusEntities } from '../landing/blast_radius_entities';
import { SignificantEventList } from '../landing/significant_event_list';
import { SignificantEventStatuses } from '../landing/significant_event_statuses';
import { EventFlyout } from '../event/event_flyout';
import { NightshiftHeader } from './header';
import { NightshiftEmptyState } from './empty_state';
import {
  BLAST_RADIUS_QUERY_PARAM,
  clearNightshiftEventSelectionParams,
  getNightshiftEventSelectionFromSearch,
  NIGHTSHIFT_EVENT_ID_QUERY_PARAM,
  NIGHTSHIFT_EVENT_UUID_QUERY_PARAM,
  setNightshiftEventSelectionParams,
} from '../common/url_params';

const COMPACT_APP_HEADER_HEIGHT_PX = 48;
const POPULATED_CONTENT_TRANSITION_MS = 400;

const loadingStateExitAnimation = keyframes`
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-16px) scale(0.985);
  }
`;

const populatedContentEntryAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const setElementInert = (element: HTMLDivElement | null): void => {
  element?.setAttribute('inert', '');
};

const resolveSelectedEvent = ({
  events,
  eventIdFromUrl,
  eventUuidFromUrl,
}: {
  events: SignificantEvent[];
  eventIdFromUrl?: string;
  eventUuidFromUrl?: string;
}): SignificantEvent | undefined => {
  if (eventUuidFromUrl) {
    const byUuid = events.find(({ event_uuid: eventUuid }) => eventUuid === eventUuidFromUrl);
    if (byUuid) {
      return byUuid;
    }
  }

  if (eventIdFromUrl) {
    return events.find(({ event_id: eventId }) => eventId === eventIdFromUrl);
  }

  return undefined;
};

export function NightshiftApp(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder, application } = useKibana().services;
  const history = useHistory();
  const { search } = useLocation();
  const needsActionSectionRef = useRef<HTMLElement>(null);
  const resolvedSectionRef = useRef<HTMLElement>(null);
  const [isTransitioningFromLoading, setIsTransitioningFromLoading] = useState(false);

  const { data, error: eventsError, isFetching, isLoading, refetch } = useFetchSignificantEvents();
  const { closeSignificantEvent, closingEventUuid } = useCloseSignificantEvent();
  const wasLoadingRef = useRef(isLoading);

  const events = useMemo(() => data?.hits ?? [], [data]);

  // Derived from the freshest fetched list (not a click-time snapshot), so
  // background refetches keep the open flyout current.
  const { eventId: selectedEventIdFromUrl, eventUuid: selectedEventUuid } = useMemo(
    () => getNightshiftEventSelectionFromSearch(search),
    [search]
  );
  const selectedEvent = useMemo(
    () =>
      resolveSelectedEvent({
        events,
        eventIdFromUrl: selectedEventIdFromUrl,
        eventUuidFromUrl: selectedEventUuid,
      }),
    [events, selectedEventIdFromUrl, selectedEventUuid]
  );
  const [eventNotFound, setEventNotFound] = useState(false);

  const selectedBlastRadiusKey = useMemo(
    () => new URLSearchParams(search).get(BLAST_RADIUS_QUERY_PARAM) ?? undefined,
    [search]
  );

  const showAllEventsHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    deepLinkId: 'events',
  });
  const emptyStateLogsHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/significant_events?rangeFrom=now-24h&rangeTo=now',
  });

  const handleChatClick = useCallback(
    (event: SignificantEvent) => {
      agentBuilder?.openChat(buildNewSignificantEventChatOptions(event));
    },
    [agentBuilder]
  );
  const onChatClick = agentBuilder ? handleChatClick : undefined;
  const handleCloseSignificantEvent = useCallback(
    (event: SignificantEvent) => closeSignificantEvent(event.event_uuid),
    [closeSignificantEvent]
  );

  const handleEventClick = useCallback(
    (event: SignificantEvent) => {
      setEventNotFound(false);
      const params = new URLSearchParams(history.location.search);
      setNightshiftEventSelectionParams(params, {
        eventId: event.event_id,
        eventUuid: event.event_uuid,
      });
      history.replace({ search: params.toString() });
    },
    [history]
  );

  const handleFlyoutClose = useCallback(() => {
    setEventNotFound(false);
    const params = new URLSearchParams(history.location.search);
    clearNightshiftEventSelectionParams(params);
    history.replace({ search: params.toString() });
  }, [history]);

  // Highest-severity events first so critical items are never buried below older, lower-impact ones.
  const needsActionEvents = useMemo(
    () => getNeedsActionEvents(events).sort(byCriticalityAndUpdatedAtDesc),
    [events]
  );
  const resolvedEvents = useMemo(
    () => getResolvedEvents(events).sort(byCriticalityAndUpdatedAtDesc),
    [events]
  );

  // The events we display drive the empty state.
  const shownEvents = useMemo(
    () => [...needsActionEvents, ...resolvedEvents],
    [needsActionEvents, resolvedEvents]
  );

  // Blast radius pills come from each event's `blast_radius[]` (stream_names only when absent).
  const blastRadius = useMemo(() => buildBlastRadiusChips(needsActionEvents), [needsActionEvents]);

  const activeBlastRadiusChip = blastRadius.some(({ key }) => key === selectedBlastRadiusKey)
    ? selectedBlastRadiusKey
    : undefined;

  const handleBlastRadiusSelect = useCallback(
    (chipKey: string) => {
      const params = new URLSearchParams(history.location.search);
      const nextKey = activeBlastRadiusChip === chipKey ? undefined : chipKey;
      if (nextKey) {
        params.set(BLAST_RADIUS_QUERY_PARAM, nextKey);
      } else {
        params.delete(BLAST_RADIUS_QUERY_PARAM);
      }
      history.replace({ search: params.toString() });
    },
    [activeBlastRadiusChip, history]
  );

  const visibleNeedsActionEvents = useMemo(
    () => filterEventsByBlastRadiusChip(needsActionEvents, activeBlastRadiusChip),
    [needsActionEvents, activeBlastRadiusChip]
  );
  const visibleResolvedEvents = useMemo(
    () => filterEventsByBlastRadiusChip(resolvedEvents, activeBlastRadiusChip),
    [resolvedEvents, activeBlastRadiusChip]
  );

  const selectedEventVisible = useMemo(() => {
    if (!selectedEvent) {
      return false;
    }
    return (
      needsActionEvents.some(
        ({ event_uuid: eventUuid }) => eventUuid === selectedEvent.event_uuid
      ) ||
      resolvedEvents.some(({ event_uuid: eventUuid }) => eventUuid === selectedEvent.event_uuid)
    );
  }, [needsActionEvents, resolvedEvents, selectedEvent]);

  useEffect(() => {
    const hasSelectionInUrl = Boolean(selectedEventUuid || selectedEventIdFromUrl);
    if (hasSelectionInUrl && !selectedEvent && !isLoading) {
      setEventNotFound(true);
      const params = new URLSearchParams(history.location.search);
      if (
        params.has(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM) ||
        params.has(NIGHTSHIFT_EVENT_ID_QUERY_PARAM)
      ) {
        clearNightshiftEventSelectionParams(params);
        history.replace({ search: params.toString() });
      }
      return;
    }
    if (selectedEvent) {
      setEventNotFound(false);
      if (
        selectedEventUuid !== selectedEvent.event_uuid ||
        selectedEventIdFromUrl !== selectedEvent.event_id
      ) {
        const params = new URLSearchParams(history.location.search);
        setNightshiftEventSelectionParams(params, {
          eventId: selectedEvent.event_id,
          eventUuid: selectedEvent.event_uuid,
        });
        history.replace({ search: params.toString() });
      }
    }
  }, [history, isLoading, selectedEvent, selectedEventIdFromUrl, selectedEventUuid]);

  const scrollToSection = (sectionRef: React.RefObject<HTMLElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToNeedsAction = useCallback(() => {
    scrollToSection(needsActionSectionRef);
  }, []);

  const scrollToResolved = useCallback(() => {
    scrollToSection(resolvedSectionRef);
  }, []);

  const hasEvents = shownEvents.length > 0;
  const hasNeedsAction = needsActionEvents.length > 0;
  const showCenteredEmptyLayout = isLoading || !hasEvents;
  const contentTopMargin =
    showCenteredEmptyLayout && !isLoading ? euiTheme.size.m : euiTheme.size.l;
  const constrainContentToViewport = showCenteredEmptyLayout || isTransitioningFromLoading;
  const viewportContentHeight = `calc(
    var(--kbn-application--content-height, 100vh) -
    ${COMPACT_APP_HEADER_HEIGHT_PX}px -
    ${euiTheme.size.l} -
    ${euiTheme.size.l} -
    ${contentTopMargin}
  )`;

  useLayoutEffect(() => {
    const shouldTransitionToPopulatedContent =
      wasLoadingRef.current && !isLoading && hasEvents && !eventsError;
    wasLoadingRef.current = isLoading;

    if (!shouldTransitionToPopulatedContent) {
      if (isLoading) {
        setIsTransitioningFromLoading(false);
      }
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    setIsTransitioningFromLoading(true);
    const transitionTimeout = window.setTimeout(
      () => setIsTransitioningFromLoading(false),
      POPULATED_CONTENT_TRANSITION_MS
    );

    return () => window.clearTimeout(transitionTimeout);
  }, [eventsError, hasEvents, isLoading]);

  usePageReady({
    isReady: !isLoading && !eventsError,
    isRefreshing: isFetching && !isLoading,
    customMetrics: {
      key1: 'critical_high_event_count',
      value1: events.length,
      key2: 'needs_action_event_count',
      value2: needsActionEvents.length,
      key3: 'resolved_event_count',
      value3: resolvedEvents.length,
      key4: 'blast_radius_filter_active',
      value4: activeBlastRadiusChip ? 1 : 0,
    },
    meta: {
      description:
        '[ttfmp_nightshift] The Nightshift landing page has loaded critical/high significant events.',
    },
  });

  const sharedListProps = {
    closingEventUuid,
    onChatClick,
    onCloseClick: handleCloseSignificantEvent,
    onEventClick: handleEventClick,
    selectedEventUuid: selectedEvent?.event_uuid,
  };

  const eventNotFoundCallout = eventNotFound ? (
    <div
      css={css`
        margin-top: ${euiTheme.size.m};
        width: 100%;
      `}
    >
      <EuiCallOut
        announceOnMount
        color="warning"
        iconType="warning"
        size="s"
        title={i18n.translate('xpack.nightshift.eventNotFoundTitle', {
          defaultMessage: 'Significant Event not found',
        })}
      >
        <EuiText size="s">
          {i18n.translate('xpack.nightshift.eventNotFoundDescription', {
            defaultMessage:
              'The event in this link is no longer in the current results. The URL has been cleared.',
          })}
        </EuiText>
      </EuiCallOut>
    </div>
  ) : null;

  // Only treat a load failure as fatal when there is nothing to show; a failed
  // background refetch that still has cached data degrades to a non-blocking warning.
  if (eventsError && !hasEvents && !isLoading) {
    return <LoadingErrorCallout onRetry={() => refetch()} />;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        align-items: ${showCenteredEmptyLayout ? 'center' : 'stretch'};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        box-sizing: border-box;
        gap: ${showCenteredEmptyLayout ? euiTheme.size.xl : 0};
        height: ${constrainContentToViewport ? viewportContentHeight : 'auto'};
        justify-content: ${showCenteredEmptyLayout ? 'center' : 'flex-start'};
        margin-top: ${contentTopMargin};
        min-height: 0;
        overflow-y: ${constrainContentToViewport ? 'clip' : 'visible'};
        padding: ${showCenteredEmptyLayout ? euiTheme.size.xxl : 0}
          ${showCenteredEmptyLayout ? euiTheme.size.xl : 0} calc(${euiTheme.size.xxl} * 1.5);
        position: relative;
      `}
    >
      <NightshiftHeader
        isEmptyState={showCenteredEmptyLayout}
        isLoading={isLoading}
        hasNeedsAction={hasNeedsAction}
        showAllEventsHref={hasEvents ? showAllEventsHref : undefined}
      />

      {showCenteredEmptyLayout ? (
        <>
          {eventNotFoundCallout}
          <NightshiftEmptyState isProcessing={isLoading} logsHref={emptyStateLogsHref} />
        </>
      ) : (
        <div
          data-test-subj="nightshiftPopulatedContent"
          css={[
            css`
              width: 100%;

              @media (prefers-reduced-motion: reduce) {
                animation: none;
              }
            `,
            isTransitioningFromLoading &&
              css`
                animation: ${populatedContentEntryAnimation} ${POPULATED_CONTENT_TRANSITION_MS}ms
                  ${euiTheme.animation.resistance} both;
              `,
          ]}
        >
          {eventsError && (
            <div
              css={css`
                margin-top: ${euiTheme.size.m};
              `}
            >
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="warning"
                size="s"
                title={i18n.translate('xpack.nightshift.refreshWarningTitle', {
                  defaultMessage: 'Showing the last loaded results; refreshing failed.',
                })}
              >
                <EuiButtonEmpty
                  color="warning"
                  data-test-subj="nightshiftRefreshRetryButton"
                  flush="left"
                  iconType="refresh"
                  onClick={() => refetch()}
                  size="s"
                >
                  {i18n.translate('xpack.nightshift.retryButtonText', {
                    defaultMessage: 'Retry',
                  })}
                </EuiButtonEmpty>
              </EuiCallOut>
            </div>
          )}

          {eventNotFoundCallout}

          <SignificantEventStatuses
            needsActionCount={needsActionEvents.length}
            onNeedsActionClick={scrollToNeedsAction}
            onResolvedClick={scrollToResolved}
            resolvedCount={resolvedEvents.length}
          />

          <BlastRadiusEntities
            entities={blastRadius}
            onSelect={handleBlastRadiusSelect}
            selectedEntityKey={activeBlastRadiusChip}
          />

          <EuiFlexItem
            css={css`
              margin-top: ${euiTheme.size.l};
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
              {needsActionEvents.length > 0 && (
                <EuiFlexItem>
                  <SignificantEventList
                    {...sharedListProps}
                    events={visibleNeedsActionEvents}
                    filterActive={Boolean(activeBlastRadiusChip)}
                    onClearFilter={
                      activeBlastRadiusChip
                        ? () => handleBlastRadiusSelect(activeBlastRadiusChip)
                        : undefined
                    }
                    sectionRef={needsActionSectionRef}
                    statusColor="danger"
                    title={i18n.translate('xpack.nightshift.list.needActionTitle', {
                      defaultMessage: 'Need Action',
                    })}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <SignificantEventList
                  {...sharedListProps}
                  events={visibleResolvedEvents}
                  filterActive={Boolean(activeBlastRadiusChip && resolvedEvents.length > 0)}
                  onClearFilter={
                    activeBlastRadiusChip && resolvedEvents.length > 0
                      ? () => handleBlastRadiusSelect(activeBlastRadiusChip)
                      : undefined
                  }
                  sectionRef={resolvedSectionRef}
                  statusColor="success"
                  title={i18n.translate('xpack.nightshift.list.resolvedTitle', {
                    defaultMessage: 'Resolved',
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </div>
      )}

      {isTransitioningFromLoading && (
        <div
          aria-hidden={true}
          data-test-subj="nightshiftLoadingExitTransition"
          ref={setElementInert}
          css={css`
            align-items: center;
            animation: ${loadingStateExitAnimation} ${POPULATED_CONTENT_TRANSITION_MS}ms
              ${euiTheme.animation.resistance} both;
            background: ${euiTheme.colors.backgroundBaseSubdued};
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.xl};
            inset: 0;
            justify-content: center;
            padding: ${euiTheme.size.xxl} ${euiTheme.size.xl} calc(${euiTheme.size.xxl} * 1.5);
            pointer-events: none;
            position: absolute;
            z-index: 1;

            @media (prefers-reduced-motion: reduce) {
              animation: none;
            }
          `}
        >
          <NightshiftHeader isEmptyState isLoading />
          <NightshiftEmptyState isProcessing logsHref={emptyStateLogsHref} />
        </div>
      )}

      {selectedEvent && selectedEventVisible && (
        <EventFlyout
          key={selectedEvent.event_id}
          event={selectedEvent}
          onClose={handleFlyoutClose}
        />
      )}
    </EuiFlexGroup>
  );
}

function LoadingErrorCallout({ onRetry }: { onRetry: () => void }): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCallOut
      color="danger"
      iconType="warning"
      announceOnMount
      title={i18n.translate('xpack.nightshift.loadingErrorTitle', {
        defaultMessage: 'Unable to load significant events',
      })}
      css={css`
        margin-top: ${euiTheme.size.l};
      `}
    >
      <EuiButton
        color="danger"
        data-test-subj="nightshiftLoadingErrorRetryButton"
        iconType="refresh"
        onClick={onRetry}
        size="s"
      >
        {i18n.translate('xpack.nightshift.retryButtonText', {
          defaultMessage: 'Retry',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
