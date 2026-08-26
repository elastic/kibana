/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getFlyoutManagerStore, useEuiTheme, useIsInManagedFlyout } from '@elastic/eui';

/**
 * Returns an explicit z-index for an `EuiFlyout` that is rendered *inside* an EUI managed flyout
 * subtree but should visually behave like a standalone flyout stacked on top - e.g. a flyout opened
 * from within the Response console `PageOverlay` when the console itself was opened from a managed
 * (new system / v2) flyout, as happens in Discover.
 *
 * Background: a standard (`session="never"`) `EuiFlyout` that is *not* inside a managed flyout slots
 * itself into EUI's shared z-index sequence (`levels.flyout + currentZIndex`), which correctly puts
 * it above the console overlay. But when the same flyout is rendered *inside* a managed flyout's
 * React subtree, EUI instead pins its z-index to the parent session's base level
 * (`currentSession.zIndex`, ie `levels.flyout`), dropping it *behind* the overlay.
 *
 * To keep the two cases consistent, when we detect we're inside a managed flyout we compute the
 * z-index ourselves the same way an unmanaged flyout would (`levels.flyout + currentZIndex`), so the
 * flyout stacks above the overlay (which registered itself as an unmanaged flyout and therefore
 * already bumped `currentZIndex`).
 *
 * Returns `undefined` when not active or not inside a managed flyout, in which case EUI's default
 * unmanaged-flyout stacking already does the right thing and the caller must NOT override it.
 *
 * @param active whether the flyout is currently open (the z-index is captured while it is open)
 */
export const useManagedContextFlyoutZIndex = (active: boolean): number | undefined => {
  const isInManagedFlyout = useIsInManagedFlyout();
  const { euiTheme } = useEuiTheme();
  const flyoutLevel = euiTheme.levels.flyout as number;

  return useMemo(() => {
    if (!active || !isInManagedFlyout) {
      return undefined;
    }

    return flyoutLevel + getFlyoutManagerStore().getState().currentZIndex;
  }, [active, isInManagedFlyout, flyoutLevel]);
};
