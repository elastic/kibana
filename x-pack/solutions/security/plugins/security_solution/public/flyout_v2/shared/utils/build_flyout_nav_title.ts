/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlyoutManagerStore } from '@elastic/eui';

const NAV_TITLE_SEPARATOR = ' -> ';

/**
 * Builds the flyout-history title for a child flyout about to be opened with
 * `session: 'inherit'`, from whatever is currently active in the session:
 *   - When a session is active: `"<label of whatever is currently displayed> -> <childTitle>"`
 *   - When no session is active (e.g. opened directly): `childTitle`
 *
 * Always flat — exactly one hop, never accumulating. "Whatever is currently displayed" is the
 * session's current child if it has one (else its root), reduced to its OWN bare label by
 * dropping everything before the last separator, so composing repeatedly (e.g. a document -> a
 * graph tool -> an entity opened from a graph node -> another entity from there) reads
 * "Entity -> Entity" at each step, not "Document -> Graph -> Entity -> Entity".
 *
 * Deliberately a plain function, NOT a hook: `overlays.openSystemFlyout` mounts each flyout's
 * content into its own separate React root, so a callback computed once via a hook (e.g.
 * `onShowHost`) and passed as a prop into a tool opened from a DIFFERENT flyout (e.g. `GraphView`)
 * gets frozen with whatever session was active at the moment that prop was handed off — it never
 * sees the session that's actually active by the time the callback fires. Reading the flyout
 * manager's live state fresh, at call time, from a non-memoized function avoids that entirely:
 * it doesn't matter which component's closure holds the reference, only when it's invoked.
 */
export const buildFlyoutNavTitle = (childTitle: string): string => {
  const { sessions } = getFlyoutManagerStore().getState();
  const currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const currentTitle = currentSession?.childTitle ?? currentSession?.title;

  if (!currentTitle) {
    return childTitle;
  }

  const currentLabel = currentTitle.split(NAV_TITLE_SEPARATOR).pop() ?? currentTitle;
  return `${currentLabel}${NAV_TITLE_SEPARATOR}${childTitle}`;
};
