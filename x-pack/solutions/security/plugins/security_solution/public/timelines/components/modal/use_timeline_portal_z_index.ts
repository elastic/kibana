/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { getFlyoutManagerStore, useEuiTheme } from '@elastic/eui';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';

/**
 * Id used to register the Timeline portal with EUI's flyout manager. This does not need to be
 * unique across the app (Timeline is a singleton), it only needs to be stable.
 */
const TIMELINE_UNMANAGED_FLYOUT_ID = 'security-solution-timeline';

/**
 * Only relevant when the new (EUI-managed) flyout system is enabled (see `useIsNewFlyoutEnabled`).
 *
 * The new flyout system bumps a shared `currentZIndex` counter by 3 every time a new main flyout
 * is opened (1000, 1003, 1006, ...), regardless of whether that flyout was opened from Timeline or
 * not. Timeline's z-index used to be a static value (`euiTheme.levels.maskBelowHeader`), which meant
 * that as soon as 2 flyouts were stacked, the second one would render above Timeline - even though
 * Timeline itself was opened "on top" of the first flyout via "Investigate in timeline".
 *
 * To fix this, we register Timeline as an "unmanaged flyout" with EUI's flyout manager
 * (`getFlyoutManagerStore`). This is the same mechanism EUI itself uses for plain, unmanaged
 * `EuiFlyout`s (ie `session={false}`), so that any content that isn't a managed flyout can still
 * slot into the same shared z-index sequence.
 *
 * The key trick is *when* we capture our z-index: we read `currentZIndex` right before we register,
 * so we claim whatever slot was "next in line" at the moment Timeline opened.
 *  - Flyouts opened *before* Timeline already claimed a lower slot -> they stay behind Timeline.
 *  - Flyouts opened *after* Timeline is shown (eg from within Timeline's own table) will read
 *    `currentZIndex` *after* Timeline bumped it -> they render above Timeline.
 *
 * This means we don't need to know/care whether a flyout was opened "from Timeline" or not -  the
 * ordering falls out naturally from *when* each surface registered itself.
 *
 * Returns `undefined` when the new flyout system is disabled or Timeline isn't visible, in which
 * case the caller should fall back to the existing static z-index behavior.
 */
export const useTimelinePortalZIndex = (visible: boolean): number | undefined => {
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const { euiTheme } = useEuiTheme();
  const [zIndex, setZIndex] = useState<number | undefined>(undefined);
  const flyoutLevel = euiTheme.levels.flyout as number;

  // avoid re-registering on every render because of an unstable `flyoutLevel` reference
  const flyoutLevelRef = useRef(flyoutLevel);
  flyoutLevelRef.current = flyoutLevel;

  useEffect(() => {
    if (!isNewFlyoutEnabled || !visible) {
      setZIndex(undefined);
      return;
    }

    const store = getFlyoutManagerStore();

    // capture the offset BEFORE registering ourselves, see explanation above
    const offset = store.getState().currentZIndex;
    setZIndex(flyoutLevelRef.current + offset);

    store.addUnmanagedFlyout(TIMELINE_UNMANAGED_FLYOUT_ID);

    return () => {
      store.closeUnmanagedFlyout(TIMELINE_UNMANAGED_FLYOUT_ID);
    };
  }, [isNewFlyoutEnabled, visible]);

  return isNewFlyoutEnabled ? zIndex : undefined;
};
