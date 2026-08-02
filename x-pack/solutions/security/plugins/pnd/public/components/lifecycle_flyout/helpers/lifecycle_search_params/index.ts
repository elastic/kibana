/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The query param the four-phase overlay opens on.
 *
 * The overlay's state lives in the URL rather than in React context, for three reasons: any page can
 * open it without a provider being mounted above that page (`application.tsx` belongs to no group in
 * this wave), the browser Back button closes it, and a lifecycle worth talking about can be pasted
 * into a chat.
 */
export const LIFECYCLE_FLYOUT_QUERY_PARAM = 'lifecycle';

/**
 * The query param the overlay's **active tab** travels in, for the same three reasons the discovery
 * id does: a colleague can be sent straight to the Timeline of one discovery, and a reload reopens
 * the tab the analyst was reading rather than resetting them to Overview.
 *
 * A second param rather than a widened {@link buildLifecycleSearch}: every caller that opens the
 * overlay (`useOpenLifecycle`, and the `/investigations/*` deep links) opens it on Overview, so
 * making them all pass a tab would be ceremony at every call site to express the default.
 */
export const LIFECYCLE_FLYOUT_TAB_QUERY_PARAM = 'lifecycleTab';

/**
 * The overlay's two tabs, in render order.
 *
 * Two rather than five, per **decision 1** of the 2026-08-17 Experience/UX sync: *"Flyout goes to
 * tabs: an Overview tab (description, related items, fields table, attachments) and a separate
 * Timeline tab"*. The three ids that used to live here — `attachments`, `tuning` and `lifecycle` —
 * are now **sections inside Overview** (`sections/`), so nothing they showed was lost; only the tab
 * bar shrank. A stale `?lifecycleTab=attachments` therefore resolves to Overview through
 * {@link readLifecycleTabId}, which is where that content now is.
 *
 * `overview` first, and therefore the default: it is the only tab that answers "where is this
 * discovery right now?" without the analyst having to read 14 rows.
 */
export const LIFECYCLE_TAB_IDS = ['overview', 'timeline'] as const;

export type LifecycleTabId = (typeof LIFECYCLE_TAB_IDS)[number];

/** The tab an overlay opens on when the URL does not name one, or names one that does not exist. */
export const DEFAULT_LIFECYCLE_TAB_ID: LifecycleTabId = LIFECYCLE_TAB_IDS[0];

/** Whether a raw URL value is one of the overlay's tabs. Narrows, so nothing has to be cast. */
export const isLifecycleTabId = (value: string | null | undefined): value is LifecycleTabId =>
  value != null && (LIFECYCLE_TAB_IDS as readonly string[]).includes(value);

/** The discovery whose lifecycle the overlay is showing, or `undefined` when it is closed. */
export const readLifecycleAlertId = (search: string): string | undefined => {
  const value = new URLSearchParams(search).get(LIFECYCLE_FLYOUT_QUERY_PARAM);

  return value != null && value !== '' ? value : undefined;
};

/**
 * The tab the overlay is showing.
 *
 * Total rather than partial: an absent, empty or unknown value resolves to Overview instead of
 * `undefined`, because a hand-edited or stale `?lifecycleTab=` must never leave the overlay with a
 * selected tab that has no panel — which renders as an empty flyout with no way back.
 */
export const readLifecycleTabId = (search: string): LifecycleTabId => {
  const value = new URLSearchParams(search).get(LIFECYCLE_FLYOUT_TAB_QUERY_PARAM);

  return isLifecycleTabId(value) ? value : DEFAULT_LIFECYCLE_TAB_ID;
};

/** The search string that opens the overlay, keeping whatever params the page already had. */
export const buildLifecycleSearch = (search: string, correlationId: string): string => {
  const params = new URLSearchParams(search);
  params.set(LIFECYCLE_FLYOUT_QUERY_PARAM, correlationId);

  return `?${params.toString()}`;
};

/** The search string that selects a tab, keeping whatever params the page already had. */
export const buildLifecycleTabSearch = (search: string, tabId: LifecycleTabId): string => {
  const params = new URLSearchParams(search);
  params.set(LIFECYCLE_FLYOUT_TAB_QUERY_PARAM, tabId);

  return `?${params.toString()}`;
};

/**
 * The search string that closes the overlay, keeping whatever params the page already had.
 *
 * The tab param goes with it: it only means anything while the overlay is open, and leaving it
 * behind would both litter the page's URL and reopen the next discovery on whichever tab the
 * previous one was left on.
 */
export const clearLifecycleSearch = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete(LIFECYCLE_FLYOUT_QUERY_PARAM);
  params.delete(LIFECYCLE_FLYOUT_TAB_QUERY_PARAM);

  const remaining = params.toString();

  return remaining === '' ? '' : `?${remaining}`;
};
