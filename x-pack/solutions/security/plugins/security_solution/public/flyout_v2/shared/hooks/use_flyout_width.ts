/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useSystemFlyoutSize } from '@kbn/core-overlays-browser';
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_WIDTH_LOCAL_STORAGE } from '../constants/local_storage';

/**
 * Reads the persisted main-flyout width (in pixels), or `undefined` when unset or invalid. Kept as
 * a plain function (not a hook) so it can be read fresh at flyout open time.
 */
export const getStoredFlyoutWidth = (storage: Storage): number | undefined => {
  const stored = storage.get(FLYOUT_WIDTH_LOCAL_STORAGE);
  return typeof stored === 'number' && stored > 0 ? stored : undefined;
};

/**
 * Persists the main-flyout width (in pixels). Called from the flyout's `onResize`.
 */
export const setStoredFlyoutWidth = (storage: Storage, width: number): void => {
  storage.set(FLYOUT_WIDTH_LOCAL_STORAGE, width);
};

export interface UseFlyoutSizeResult {
  /** Whether a custom width is currently saved, i.e. there is something to reset. */
  hasCustomWidth: boolean;
  /**
   * Clears the saved width and resets the open flyout back to its default size (live, via the core
   * system-flyout size context).
   */
  resetSize: () => void;
}

/**
 * Drives the "Reset size" control in the flyout settings menu.
 *
 * Resetting clears the persisted width (so subsequent flyouts open at their default) and resets the
 * currently open flyout live via the core system-flyout size context.
 *
 * Must be used inside a system flyout (where {@link useSystemFlyoutSize} resolves).
 */
export const useFlyoutSize = (): UseFlyoutSizeResult => {
  const { storage } = useKibana().services;
  const systemFlyoutSize = useSystemFlyoutSize();

  const hasCustomWidth = getStoredFlyoutWidth(storage) != null;

  const resetSize = useCallback(() => {
    storage.remove(FLYOUT_WIDTH_LOCAL_STORAGE);
    systemFlyoutSize?.resetSize();
  }, [storage, systemFlyoutSize]);

  return { hasCustomWidth, resetSize };
};
