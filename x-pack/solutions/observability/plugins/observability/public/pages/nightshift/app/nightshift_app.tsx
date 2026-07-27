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
import { usePageReady } from '@kbn/ebt-tools';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from '../../../utils/kibana_react';
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
import { NightshiftHeader } from './nightshift_header';
import { NightshiftEmptyState } from './nightshift_empty_state';
import { NIGHTSHIFT_EVENT_UUID_QUERY_PARAM } from '../common/nightshift_url_params';

// Kept in the URL so a refresh or a shared link restores the open flyout.
const BLAST_RADIUS_QUERY_PARAM = 'blastRadius';
const HAPPY_PATH_TRANSITION_MS = 400;

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

const happyPathEntryAnimation = keyframes`
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

interface SelectedEventIdentity {
  eventId: string;
  eventUuid: string;
}

export function NightshiftApp(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder, application } = useKibana().services;
  const history = useHistory();
  const { search } = useLocation();
  const needsActionSectionRef = useRef<HTMLElement>(null);
  const resolvedSectionRef = useRef<HTMLElement>(null);
  const [isTransitioningFromLoading, setIsTransitioningFromLoading] = useState(false);

  const { data, error: eventsError, isLoading, refetch } = useFetchSignificantEvents();
  const { closeEvent, closingEventUuid } = useCloseSignificantEvent();
  const wasLoadingRef = useRef(isLoading);

  const events = useMemo(() => data?.hits ?? [], [data]);

  // Derived from the freshest fetched list (not a click-time snapshot), so
  // background refetches keep the open flyout current.
  const selectedEventUuid = useMemo(
    () => new URLSearchParams(search).get(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM) ?? undefined,
    [search]
  );
  const [selectedEventIdentity, setSelectedEventIdentity] = useState<SelectedEventIdentity>();
  const selectedEvent = useMemo(
    () =>
      events.find(({ event_uuid: eventUuid }) => eventUuid === selectedEventUuid) ??
      (selectedEventIdentity && selectedEventIdentity.eventUuid === selectedEventUuid
        ? events.find(({ event_id: eventId }) => eventId === selectedEventIdentity.eventId)
        : undefined),
    [events, selectedEventIdentity, selectedEventUuid]
  );
  const [eventNotFound, setEventNotFound] = useState(false);

  const selectedBlastRadiusKey = useMemo(
    () => new URLSearchParams(search).get(BLAST_RADIUS_QUERY_PARAM) ?? undefined,
    [search]
  );

  const showAllEventsHref = application.getUrlForApp('streams', {
    deepLinkId: 'significantEventsEvents',
  });
  const emptyStateLogsHref = application.getUrlForApp('streams', {
    path: '/_discovery/significant_events?rangeFrom=now-24h&rangeTo=now',
  });

  const handleChatClick = useCallback(
    (event: SignificantEvent) => {
      agentBuilder?.openChat(buildNewSignificantEventChatOptions(event));
    },
    [agentBuilder]
  );
  const onChatClick = agentBuilder ? handleChatClick : undefined;
  const handleCloseEvent = useCallback(
    (event: SignificantEvent) => closeEvent(event.event_uuid),
    [closeEvent]
  );

  const handleEventClick = useCallback(
    (event: SignificantEvent) => {
      setEventNotFound(false);
      setSelectedEventIdentity({
        eventId: event.event_id,
        eventUuid: event.event_uuid,
      });
      const params = new URLSearchParams(history.location.search);
      params.set(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM, event.event_uuid);
      history.replace({ search: params.toString() });
    },
    [history]
  );

  const handleFlyoutClose = useCallback(() => {
    setEventNotFound(false);
    setSelectedEventIdentity(undefined);
    const params = new URLSearchParams(history.location.search);
    params.delete(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM);
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
    if (selectedEventUuid && !selectedEvent && !isLoading) {
      setEventNotFound(true);
      setSelectedEventIdentity(undefined);
      const params = new URLSearchParams(history.location.search);
      if (params.has(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM)) {
        params.delete(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM);
        history.replace({ search: params.toString() });
      }
      return;
    }
    if (selectedEvent) {
      setEventNotFound(false);
      if (
        selectedEventIdentity?.eventId !== selectedEvent.event_id ||
        selectedEventIdentity?.eventUuid !== selectedEvent.event_uuid
      ) {
        setSelectedEventIdentity({
          eventId: selectedEvent.event_id,
          eventUuid: selectedEvent.event_uuid,
        });
      }
      if (selectedEventUuid && selectedEvent.event_uuid !== selectedEventUuid) {
        const params = new URLSearchParams(history.location.search);
        params.set(NIGHTSHIFT_EVENT_UUID_QUERY_PARAM, selectedEvent.event_uuid);
        history.replace({ search: params.toString() });
      }
    }
  }, [history, isLoading, selectedEvent, selectedEventIdentity, selectedEventUuid]);

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
  const isEmptyState = isLoading || !hasEvents;

  useLayoutEffect(() => {
    const shouldTransitionToHappyPath =
      wasLoadingRef.current && !isLoading && hasEvents && !eventsError;
    wasLoadingRef.current = isLoading;

    if (!shouldTransitionToHappyPath) {
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
      HAPPY_PATH_TRANSITION_MS
    );

    return () => window.clearTimeout(transitionTimeout);
  }, [eventsError, hasEvents, isLoading]);

  usePageReady({
    isReady: !isLoading && !eventsError,
    isRefreshing: isLoading,
    customMetrics: {
      key1: 'total_event_count',
      value1: events.length,
      key2: 'needs_action_event_count',
      value2: needsActionEvents.length,
      key3: 'resolved_event_count',
      value3: resolvedEvents.length,
      key4: 'blast_radius_filter_active',
      value4: activeBlastRadiusChip ? 1 : 0,
    },
    meta: {
      description: '[ttfmp_nightshift] The Nightshift landing page has loaded significant events.',
    },
  });

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
        align-items: ${isEmptyState ? 'center' : 'stretch'};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        box-sizing: border-box;
        gap: ${isEmptyState ? euiTheme.size.xl : 0};
        justify-content: ${isEmptyState ? 'center' : 'flex-start'};
        /* The page section contributes 24px; non-loading states add 12px for a 36px gap. */
        margin-top: ${isLoading ? euiTheme.size.l : euiTheme.size.m};
        min-height: ${isEmptyState || isTransitioningFromLoading ? 'calc(100vh - 140px)' : 'auto'};
        padding: ${isEmptyState ? euiTheme.size.xxl : 0} ${isEmptyState ? euiTheme.size.xl : 0}
          calc(${euiTheme.size.xxl} * 1.5);
        position: relative;
      `}
    >
      <NightshiftHeader
        isEmptyState={isEmptyState}
        isLoading={isLoading}
        hasNeedsAction={hasNeedsAction}
        showAllEventsHref={hasEvents ? showAllEventsHref : undefined}
      />

      {isEmptyState ? (
        <NightshiftEmptyState isProcessing={isLoading} logsHref={emptyStateLogsHref} />
      ) : (
        <div
          data-test-subj="nightshiftHappyPath"
          css={[
            css`
              width: 100%;

              @media (prefers-reduced-motion: reduce) {
                animation: none;
              }
            `,
            isTransitioningFromLoading &&
              css`
                animation: ${happyPathEntryAnimation} ${HAPPY_PATH_TRANSITION_MS}ms
                  ${euiTheme.animation.resistance} both;
              `,
          ]}
        >
          {eventsError && (
            <EuiFlexItem
              css={css`
                margin-top: ${euiTheme.size.m};
              `}
            >
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="warning"
                size="s"
                title={i18n.translate('xpack.observability.nightshift.refreshWarningTitle', {
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
                  {i18n.translate('xpack.observability.nightshift.retryButtonText', {
                    defaultMessage: 'Retry',
                  })}
                </EuiButtonEmpty>
              </EuiCallOut>
            </EuiFlexItem>
          )}

          {eventNotFound && (
            <EuiFlexItem
              css={css`
                margin-top: ${euiTheme.size.m};
              `}
            >
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="warning"
                size="s"
                title={i18n.translate('xpack.observability.nightshift.eventNotFoundTitle', {
                  defaultMessage: 'Significant Event not found',
                })}
              >
                <EuiText size="s">
                  {i18n.translate('xpack.observability.nightshift.eventNotFoundDescription', {
                    defaultMessage:
                      'The event in this link is no longer in the current results. The URL has been cleared.',
                  })}
                </EuiText>
              </EuiCallOut>
            </EuiFlexItem>
          )}

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
                    events={visibleNeedsActionEvents}
                    filterActive={Boolean(activeBlastRadiusChip)}
                    onClearFilter={
                      activeBlastRadiusChip
                        ? () => handleBlastRadiusSelect(activeBlastRadiusChip)
                        : undefined
                    }
                    onChatClick={onChatClick}
                    onCloseClick={handleCloseEvent}
                    onEventClick={handleEventClick}
                    closingEventUuid={closingEventUuid}
                    sectionRef={needsActionSectionRef}
                    selectedEventUuid={selectedEventUuid}
                    statusColor="danger"
                    title={i18n.translate('xpack.observability.nightshift.list.needActionTitle', {
                      defaultMessage: 'Need Action',
                    })}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <SignificantEventList
                  events={visibleResolvedEvents}
                  filterActive={Boolean(activeBlastRadiusChip && resolvedEvents.length > 0)}
                  onClearFilter={
                    activeBlastRadiusChip && resolvedEvents.length > 0
                      ? () => handleBlastRadiusSelect(activeBlastRadiusChip)
                      : undefined
                  }
                  onChatClick={onChatClick}
                  onCloseClick={handleCloseEvent}
                  onEventClick={handleEventClick}
                  closingEventUuid={closingEventUuid}
                  sectionRef={resolvedSectionRef}
                  selectedEventUuid={selectedEventUuid}
                  statusColor="success"
                  title={i18n.translate('xpack.observability.nightshift.list.resolvedTitle', {
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
            animation: ${loadingStateExitAnimation} ${HAPPY_PATH_TRANSITION_MS}ms
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
      title={i18n.translate('xpack.observability.nightshift.loadingErrorTitle', {
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
        {i18n.translate('xpack.observability.nightshift.retryButtonText', {
          defaultMessage: 'Retry',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
