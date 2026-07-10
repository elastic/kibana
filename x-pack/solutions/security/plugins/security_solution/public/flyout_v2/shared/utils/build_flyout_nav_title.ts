/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlyoutManagerStore } from '@elastic/eui';

const NAV_TITLE_SEPARATOR = ' -> ';

// Recovers a composed title's own trailing label without re-parsing the string — parsing would
// misread a raw title containing the literal separator as an existing chain.
const flatLabelByComposedTitle = new Map<string, string>();

export interface BuildFlyoutNavTitleOptions {
  /**
   * Chain from the session's root title instead of its current child. EUI's flyout-manager
   * session tracks only one "current child" slot, so a caller whose trigger stays clickable
   * after opening a child (a graph node, a table row, a header) would otherwise chain off
   * whichever child opened last — e.g. "Alert -> Host: x" instead of the anchor's own title.
   * Leave unset for a genuine drill-down (a link inside the currently displayed child's content).
   */
  resetToRoot?: boolean;
}

/**
 * Builds a flat `"<last> -> <childTitle>"` title for a child flyout (`session: 'inherit'`).
 * Never accumulates past one hop.
 *
 * A plain function, not a hook: `openSystemFlyout` mounts each flyout into its own React root, so
 * a hook-computed callback handed off as a prop would freeze with a stale session. Reading the
 * store fresh at call time avoids that.
 */
export const buildFlyoutNavTitle = (
  childTitle: string,
  { resetToRoot = false }: BuildFlyoutNavTitleOptions = {}
): string => {
  const { sessions } = getFlyoutManagerStore().getState();
  const currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const currentTitle = resetToRoot
    ? currentSession?.title
    : currentSession?.childTitle ?? currentSession?.title;

  if (!currentTitle) {
    return childTitle;
  }

  const currentLabel = flatLabelByComposedTitle.get(currentTitle) ?? currentTitle;
  const composedTitle = `${currentLabel}${NAV_TITLE_SEPARATOR}${childTitle}`;
  flatLabelByComposedTitle.set(composedTitle, childTitle);
  return composedTitle;
};
