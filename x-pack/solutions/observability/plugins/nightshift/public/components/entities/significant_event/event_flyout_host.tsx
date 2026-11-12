/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSkeletonTitle,
} from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
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

const STATUS_FLYOUT_TEST_SUBJ = 'nightshiftEventAlertFlyoutStatus';
const STATUS_FLYOUT_HISTORY_KEY = Symbol('nightshiftEventAlertFlyoutStatus');

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

const EventFlyoutById = ({
  eventId,
  isReady,
  onClose,
}: {
  eventId?: string;
  /** The event types are registered, which the flyout's investigation card reports against. */
  isReady: boolean;
  onClose: () => void;
}) => {
  // The width the alert flyouts open at, so the two look alike next to an investigation.
  const width = useAlertDetailsFlyoutWidth();
  const { data: event, isError } = useFetchEventById(eventId);
  // No event id, no such event, or a failed lookup: say so in the flyout, like the alert flyouts.
  const isUnavailable = eventId === undefined || isError || event === null;
  const status = <EventFlyoutStatus isError={isUnavailable} size={width} onClose={onClose} />;

  return event && isReady ? (
    <React.Suspense fallback={status}>
      <LazyEventFlyout event={event} onClose={onClose} type="overlay" size={width} />
    </React.Suspense>
  ) : (
    status
  );
};

export interface EventFlyoutHostProps {
  eventId?: string;
  onClose: () => void;
  coreStart: CoreStart;
  pluginsStart: NightshiftStartDependencies;
  focusedSignificantEventService: FocusedSignificantEventService;
  /** Registers Nightshift's analytics event types; the app does it on mount, this host may not. */
  ensureEbtEvents: () => Promise<void>;
}

/**
 * The event flyout for a host outside the Nightshift app, such as an investigation opening the
 * alert behind an event; loaded on demand, see `lazy_event_flyout.tsx`. Brings the providers the app root otherwise supplies. Opens at once with
 * a loading state, and says so in the flyout when there is no such event.
 */
export const EventFlyoutHost = ({
  eventId,
  onClose,
  coreStart,
  pluginsStart,
  focusedSignificantEventService,
  ensureEbtEvents,
}: EventFlyoutHostProps) => {
  const services = useMemo(
    () => ({ ...coreStart, ...pluginsStart, focusedSignificantEventService }),
    [coreStart, pluginsStart, focusedSignificantEventService]
  );
  // Per mount: the flyout's cache lives and dies with it.
  const [queryClient] = useState(() => new QueryClient());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const markReady = () => {
      if (isCurrent) {
        setIsReady(true);
      }
    };
    ensureEbtEvents().then(markReady, markReady);
    return () => {
      isCurrent = false;
    };
  }, [ensureEbtEvents]);

  return (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <EventFlyoutById eventId={eventId} isReady={isReady} onClose={onClose} />
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
