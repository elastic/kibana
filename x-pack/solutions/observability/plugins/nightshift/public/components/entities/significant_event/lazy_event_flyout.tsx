/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { get } from 'lodash';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import type { CoreStart } from '@kbn/core/public';
import type {
  AlertFlyoutProps,
  AlertFlyoutRegistration,
} from '@kbn/agentic-investigations-plugin/public';
import { useAlertDetailsFlyoutWidth } from '@kbn/alerting-v2-episodes-ui/components/details/use_alert_details_flyout_width';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { FocusedSignificantEventService } from '../../../chat/focused_significant_event_service';
import { useFetchEventById } from '../../../data/significant_events/use_fetch_event_by_id';
import type { NightshiftStartDependencies } from '../../../types';

/** The event flyout pulls in the whole Nightshift UI, so it loads when an alert opens it. */
const LazyEventFlyout = React.lazy(async () => {
  const { EventFlyout } = await import('./event_flyout');
  return { default: EventFlyout };
});

const EVENT_FLYOUT_TEST_SUBJ = 'nightshiftEventFlyout';
const STATUS_FLYOUT_TEST_SUBJ = 'nightshiftEventAlertFlyoutStatus';
const STATUS_FLYOUT_HISTORY_KEY = Symbol('nightshiftEventAlertFlyoutStatus');
const FOCUS_MAX_FRAMES = 60;

const FLYOUT_TITLE = i18n.translate('xpack.nightshift.flyout.eventAlertFlyoutTitle', {
  defaultMessage: 'Significant event',
});
const LOADING_LABEL = i18n.translate('xpack.nightshift.flyout.eventAlertFlyoutLoading', {
  defaultMessage: 'Loading the significant event',
});
const UNAVAILABLE_TITLE = i18n.translate('xpack.nightshift.flyout.eventUnavailableTitle', {
  defaultMessage: 'Unable to load the significant event',
});
const UNAVAILABLE_BODY = i18n.translate('xpack.nightshift.flyout.eventUnavailableBody', {
  defaultMessage: 'It may have been deleted, or you may not have access to it.',
});

/**
 * The event id of a significant event's alerting v2 alert. The alert's `data.event_id` is the
 * contract with `agentic_investigations`, whose subject snapshot keeps the alert's `data`.
 */
export const getEventId = (snapshot: AlertFlyoutProps['snapshot']): string | undefined => {
  const eventId = get(snapshot, ['data', 'event_id']);
  return typeof eventId === 'string' && eventId.length > 0 ? eventId : undefined;
};

/**
 * An overlay flyout does not take focus from the page, so Esc would go to the page behind it.
 * Moves focus into the flyout once it is in the DOM, so Esc closes it the way EUI intends,
 * including when it has a child flyout open.
 */
const useFocusFlyout = (testSubj: string) => {
  useEffect(() => {
    let frame = 0;
    let frames = 0;
    const focus = () => {
      const flyout = document.querySelector<HTMLElement>(`[data-test-subj="${testSubj}"]`);
      if (flyout) {
        flyout.focus({ preventScroll: true });
      } else if (frames++ < FOCUS_MAX_FRAMES) {
        frame = window.requestAnimationFrame(focus);
      }
    };
    frame = window.requestAnimationFrame(focus);
    return () => window.cancelAnimationFrame(frame);
  }, [testSubj]);
};

/** The flyout while the event loads, and in place of it when the event cannot be shown. */
const EventFlyoutStatus = ({
  isError,
  size,
  onClose,
}: {
  isError: boolean;
  size: number;
  onClose: () => void;
}) => {
  useFocusFlyout(STATUS_FLYOUT_TEST_SUBJ);

  return (
    <FlyoutTemplate
      type="overlay"
      ownFocus={false}
      resizable
      session="start"
      historyKey={STATUS_FLYOUT_HISTORY_KEY}
      size={size}
      onClose={onClose}
      flyoutMenuProps={{ title: FLYOUT_TITLE }}
      aria-label={FLYOUT_TITLE}
      data-test-subj={STATUS_FLYOUT_TEST_SUBJ}
    >
      <FlyoutTemplate.Header
        title={isError ? FLYOUT_TITLE : <EuiSkeletonTitle size="xs" />}
        titleText={FLYOUT_TITLE}
      />
      <FlyoutTemplate.Body>
        {isError ? (
          <EuiEmptyPrompt
            iconType="warning"
            color="danger"
            title={<h3>{UNAVAILABLE_TITLE}</h3>}
            body={<p>{UNAVAILABLE_BODY}</p>}
            data-test-subj="nightshiftEventAlertFlyoutError"
          />
        ) : (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" aria-label={LOADING_LABEL} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
};

const EventFlyoutById = ({ eventId, onClose }: { eventId?: string; onClose: () => void }) => {
  // The width the alert flyouts open at, so the two look alike next to an investigation.
  const width = useAlertDetailsFlyoutWidth();
  const { data: event, isError } = useFetchEventById(eventId);
  // No event id, no such event, or a failed lookup: say so in the flyout, like the alert flyouts.
  const isUnavailable = eventId === undefined || isError || event === null;
  const status = <EventFlyoutStatus isError={isUnavailable} size={width} onClose={onClose} />;

  return event ? (
    <React.Suspense fallback={status}>
      <FocusedEventFlyout event={event} size={width} onClose={onClose} />
    </React.Suspense>
  ) : (
    status
  );
};

const FocusedEventFlyout = ({
  event,
  size,
  onClose,
}: {
  event: SignificantEventResponse;
  size: number;
  onClose: () => void;
}) => {
  useFocusFlyout(EVENT_FLYOUT_TEST_SUBJ);
  return <LazyEventFlyout event={event} onClose={onClose} type="overlay" size={size} />;
};

interface LazyEventFlyoutRootProps extends AlertFlyoutProps {
  coreStart: CoreStart;
  pluginsStart: NightshiftStartDependencies;
  focusedSignificantEventService: FocusedSignificantEventService;
}

/**
 * The event flyout for a host outside the Nightshift app, such as an investigation opening the
 * alert behind an event. Brings the providers the app root otherwise supplies. Opens at once with
 * a loading state, and says so in the flyout when there is no such event.
 */
const LazyEventFlyoutRoot = ({
  snapshot,
  onClose,
  coreStart,
  pluginsStart,
  focusedSignificantEventService,
}: LazyEventFlyoutRootProps) => {
  const services = useMemo(
    () => ({ ...coreStart, ...pluginsStart, focusedSignificantEventService }),
    [coreStart, pluginsStart, focusedSignificantEventService]
  );
  // Per mount: the flyout's cache lives and dies with it.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <EventFlyoutById eventId={getEventId(snapshot)} onClose={onClose} />
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};

/** The flyout Nightshift registers for significant event alerts, which need an event id. */
export const createLazyEventFlyout = ({
  coreStart,
  pluginsStart,
  focusedSignificantEventService,
}: Omit<LazyEventFlyoutRootProps, keyof AlertFlyoutProps>): AlertFlyoutRegistration => {
  const EventFlyoutForAlert = (props: AlertFlyoutProps) => (
    <LazyEventFlyoutRoot
      {...props}
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      focusedSignificantEventService={focusedSignificantEventService}
    />
  );
  return {
    Component: EventFlyoutForAlert,
    canOpen: (snapshot) => getEventId(snapshot) !== undefined,
  };
};
