/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { OverlayStart } from '@kbn/core/public';
import type { History } from 'history';
import type { Store } from 'redux';
import type { ReactElement } from 'react';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../shared/components/flyout_provider';
import {
  clearToolFlyoutUrlState,
  isToolFlyoutPersistedState,
  setToolFlyoutUrlState,
  type ToolFlyoutPersistedState,
} from './url_state';

let activeToolFlyoutRef: OverlayRef | null = null;

export const getActiveToolFlyoutRef = (): OverlayRef | null => activeToolFlyoutRef;

export const closeActiveToolFlyout = (): void => {
  if (!activeToolFlyoutRef) {
    return;
  }

  const ref = activeToolFlyoutRef;
  activeToolFlyoutRef = null;
  ref.close();
};

export interface OpenToolFlyoutParams {
  overlays: OverlayStart;
  services: StartServices;
  store: Store;
  history: History;
  content: ReactElement;
  defaultFlyoutProperties: OverlaySystemFlyoutOpenOptions;
  persistedState?: ToolFlyoutPersistedState;
  historyKey?: symbol;
  session?: OverlaySystemFlyoutOpenOptions['session'];
  persistToUrl?: boolean;
  clearUrlOnClose?: boolean;
  onClose?: () => void;
}

export const openToolFlyout = ({
  overlays,
  services,
  store,
  history,
  content,
  defaultFlyoutProperties,
  persistedState,
  historyKey,
  session,
  persistToUrl = true,
  clearUrlOnClose = true,
  onClose,
}: OpenToolFlyoutParams): OverlayRef => {
  if (persistToUrl && persistedState && isToolFlyoutPersistedState(persistedState)) {
    setToolFlyoutUrlState(history, persistedState);
  }

  closeActiveToolFlyout();

  activeToolFlyoutRef = overlays.openSystemFlyout(
    flyoutProviders({
      services,
      store,
      history,
      children: content,
    }),
    {
      ...defaultFlyoutProperties,
      ...(historyKey ? { historyKey } : {}),
      ...(session ? { session } : {}),
      onClose: () => {
        activeToolFlyoutRef = null;
        if (clearUrlOnClose) {
          clearToolFlyoutUrlState(history);
        }
        onClose?.();
      },
    }
  );

  return activeToolFlyoutRef;
};
