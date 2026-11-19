/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlyoutManagerStore } from '@elastic/eui';

const NAV_TITLE_SEPARATOR = ' -> ';

/**
 * Builds a `"<session root title> -> <childTitle>"` title for a child flyout opened with
 * `session: 'inherit'` (just `childTitle` if no session is active). Always chains from the
 * session's root rather than whatever child currently happens to be open: EUI's flyout-manager
 * session tracks only one "current child" slot, and callers in this app always render their
 * trigger (a graph node, a table row, a header) inside content that stays clickable after opening
 * a child, so chaining off that child would compose onto whichever one opened last instead of the
 * anchor's own title.
 *
 * A plain function, not a hook: `openSystemFlyout` mounts each flyout into its own React root, so
 * a hook-computed callback handed off as a prop would freeze with a stale session. Reading the
 * store fresh at call time avoids that.
 */
export const buildFlyoutNavTitle = (childTitle: string): string => {
  const { sessions } = getFlyoutManagerStore().getState();
  const rootTitle = sessions.length > 0 ? sessions[sessions.length - 1].title : undefined;

  return rootTitle ? `${rootTitle}${NAV_TITLE_SEPARATOR}${childTitle}` : childTitle;
};
