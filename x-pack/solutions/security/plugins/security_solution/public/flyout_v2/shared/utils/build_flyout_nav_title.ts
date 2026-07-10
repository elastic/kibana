/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlyoutManagerStore } from '@elastic/eui';

const NAV_TITLE_SEPARATOR = ' -> ';

// Maps a composed title back to its own trailing label, so the next hop can recover it without
// re-parsing the rendered string — parsing would misread a raw title that happens to contain the
// literal separator as if it were itself a multi-hop chain.
const flatLabelByComposedTitle = new Map<string, string>();

export interface BuildFlyoutNavTitleOptions {
  /**
   * Chain from this session's own root title (the title it was opened with) instead of whichever
   * sibling child happens to currently be open. Pass `true` when the caller is a persistent anchor
   * — a graph canvas, a table — that can open several different children one after another without
   * navigating away in between (e.g. clicking a different node/row while a previous node/row's
   * child flyout is still open). EUI's flyout-manager session only ever tracks a single "current
   * child" slot, so without this the title would incorrectly chain off the previous sibling's title
   * (e.g. "Alert -> Host: my-host") instead of the anchor's own title (e.g.
   * "Graph: My Rule -> Host: my-host"). Leave this unset for genuine drill-downs — a link rendered
   * inside the currently-displayed child's own content — where chaining off that child is correct.
   */
  resetToRoot?: boolean;
}

/**
 * Builds a flat `"<last> -> <childTitle>"` history title for a child flyout opened with
 * `session: 'inherit'` (just `childTitle` if no session is active). Never accumulates past one
 * hop — document -> graph -> entity -> entity reads "Entity -> Entity" at each step, not the
 * full chain.
 *
 * A plain function, not a hook: `openSystemFlyout` mounts each flyout into its own React root, so
 * a hook-computed callback passed as a prop into a different flyout's tool would freeze with
 * whatever session was active when the prop was handed off. Reading the store fresh at call time
 * avoids that.
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
