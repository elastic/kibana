/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get } from 'lodash';
import type { CoreStart } from '@kbn/core/public';
import type {
  AgenticInvestigationsPublicPluginSetup,
  AlertFlyoutProps,
  AlertFlyoutRegistration,
} from '@kbn/agentic-investigations-plugin/public';
import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import type { FocusedSignificantEventService } from '../../../chat/focused_significant_event_service';
import type { NightshiftStartDependencies } from '../../../types';

// The plugin entry loads on every page, so it imports this file with `import()` rather than
// statically, and the flyout itself loads through `React.lazy` only when one opens.
const LazyEventFlyoutHost = React.lazy(async () => {
  const { EventFlyoutHost } = await import('./event_flyout_host');
  return { default: EventFlyoutHost };
});

/**
 * The event id of a significant event's alerting v2 alert. The alert's `data.event_id` is the
 * contract with `agentic_investigations`, whose subject snapshot keeps the alert's `data`.
 */
export const getEventId = (snapshot: AlertFlyoutProps['snapshot']): string | undefined => {
  const eventId = get(snapshot, ['data', 'event_id']);
  return typeof eventId === 'string' && eventId.length > 0 ? eventId : undefined;
};

/** The flyout Nightshift registers for significant event alerts, which need an event id. */
export const createLazyEventFlyout = ({
  coreStart,
  pluginsStart,
  focusedSignificantEventService,
  ensureEbtEvents,
  canOpen,
}: {
  coreStart: CoreStart;
  pluginsStart: NightshiftStartDependencies;
  focusedSignificantEventService: FocusedSignificantEventService;
  /** Registers Nightshift's analytics event types; the app does it on mount, this host may not. */
  ensureEbtEvents: () => Promise<void>;
  /** Whether Significant Events is available to the current user. */
  canOpen: () => boolean;
}): AlertFlyoutRegistration => {
  const EventFlyoutForAlert = ({ snapshot, onClose }: AlertFlyoutProps) => (
    <LazyEventFlyoutHost
      eventId={getEventId(snapshot)}
      onClose={onClose}
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      focusedSignificantEventService={focusedSignificantEventService}
      ensureEbtEvents={ensureEbtEvents}
    />
  );
  return {
    Component: EventFlyoutForAlert,
    canOpen: (snapshot) => canOpen() && getEventId(snapshot) !== undefined,
  };
};

/** Registers the event flyout for significant event alerts with agentic investigations. */
export const registerEventFlyout = ({
  agenticInvestigations,
  ...flyoutDeps
}: Parameters<typeof createLazyEventFlyout>[0] & {
  agenticInvestigations: AgenticInvestigationsPublicPluginSetup;
}): void => {
  agenticInvestigations.registerAlertFlyout(
    SIGNIFICANT_EVENTS_ALERT_SOURCE,
    createLazyEventFlyout(flyoutDeps)
  );
};
