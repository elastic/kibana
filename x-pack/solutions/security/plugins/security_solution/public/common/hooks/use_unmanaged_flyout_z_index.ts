/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { getFlyoutManagerStore, useEuiTheme } from '@elastic/eui';
import { useIsNewFlyoutEnabled } from './use_is_new_flyout_enabled';

export interface UseUnmanagedFlyoutZIndexParams {
  /**
   * Id used to register the surface with EUI's flyout manager. It only needs to be stable and
   * unique across the set of surfaces that might be open at the same time.
   */
  id: string;
  /**
   * Whether the surface is currently on screen. When `false` the surface is unregistered and the
   * hook returns `undefined`.
   */
  active: boolean;
}

/**
 * Only relevant when the new (EUI-managed) flyout system is enabled (see `useIsNewFlyoutEnabled`).
 *
 * Lets a non-`EuiFlyout` surface (e.g. the Timeline portal, or the Response console `PageOverlay`)
 * slot into the same shared z-index sequence that EUI uses for its flyouts, so it renders above
 * whatever was already open and below anything opened afterwards.
 *
 * The new flyout system bumps a shared `currentZIndex` counter every time a new flyout is opened
 * (managed flyouts by 3, unmanaged ones by 2). A surface with a static z-index would eventually be
 * covered by (or cover) stacked flyouts. To avoid that, we register the surface as an "unmanaged
 * flyout" with EUI's flyout manager (`getFlyoutManagerStore`) - the same mechanism EUI itself uses
 * for plain, unmanaged `EuiFlyout`s (ie `session="never"`).
 *
 * The key trick is *when* we capture our z-index: we read `currentZIndex` right before we register,
 * so we claim whatever slot was "next in line" at the moment the surface opened.
 *  - Flyouts opened *before* the surface already claimed a lower slot -> they stay behind it.
 *  - Flyouts opened *after* the surface (eg from within it) read `currentZIndex` *after* our bump ->
 *    they render above it.
 *
 * This means we don't need to know/care whether a flyout was opened "from" the surface or not - the
 * ordering falls out naturally from *when* each surface registered itself.
 *
 * Returns `undefined` when the new flyout system is disabled or the surface isn't active, in which
 * case the caller should fall back to its existing static z-index behavior.
 */
export const useUnmanagedFlyoutZIndex = ({
  id,
  active,
}: UseUnmanagedFlyoutZIndexParams): number | undefined => {
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const { euiTheme } = useEuiTheme();
  const [zIndex, setZIndex] = useState<number | undefined>(undefined);
  const flyoutLevel = euiTheme.levels.flyout as number;

  // avoid re-registering on every render because of an unstable `flyoutLevel` reference
  const flyoutLevelRef = useRef(flyoutLevel);
  flyoutLevelRef.current = flyoutLevel;

  useEffect(() => {
    if (!isNewFlyoutEnabled || !active) {
      setZIndex(undefined);
      return;
    }

    const store = getFlyoutManagerStore();

    // capture the offset BEFORE registering ourselves, see explanation above
    const offset = store.getState().currentZIndex;
    setZIndex(flyoutLevelRef.current + offset);

    store.addUnmanagedFlyout(id);

    return () => {
      store.closeUnmanagedFlyout(id);
    };
  }, [isNewFlyoutEnabled, active, id]);

  return isNewFlyoutEnabled ? zIndex : undefined;
};
