/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';

// Lazy-loaded so consumers of this hook don't statically pull the network flyout graph into their
// bundle; the chunk only loads when the flyout is actually opened.
const Network = lazy(() => import('./main').then((m) => ({ default: m.Network })));

export interface OpenNetworkFlyoutParams {
  /** The IP address to render in the flyout. */
  ip: string;
  /** Whether the IP is the source or destination of the flow. */
  flowTarget: FlowTargetSourceDest;
}

export interface NetworkFlyoutApi {
  /**
   * Opens the network (IP) details flyout as a new, top-level flyout (starting a fresh session).
   * Use this from outside any flyout — e.g. a table row, a field link, a case attachment.
   */
  openNetworkFlyout: (params: OpenNetworkFlyoutParams) => void;
  /**
   * Opens the network (IP) details flyout as a child of the currently open flyout (nested in its
   * history stack, so the back button returns to it). Use this from within an already-open flyout
   * — e.g. a node click in the graph tool, or a link inside another flyout.
   */
  openNetworkFlyoutAsChild: (params: OpenNetworkFlyoutParams) => void;
}

/**
 * Developer-facing API to open the new (EUI-based) network flyout, in the same mindset as
 * `useExpandableFlyoutApi`, `useAttackFlyoutApi`, `useRuleFlyoutApi`, etc. It encapsulates the
 * provider wiring (`flyoutProviders` + `overlays.openSystemFlyout`) and the flyout properties so
 * call sites don't repeat them.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useNetworkFlyoutApi = (): NetworkFlyoutApi => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  // `session` is the only thing that differs between a main and a child flyout. It is kept private
  // here so callers never have to reason about it: they pick `openNetworkFlyout` (main) or
  // `openNetworkFlyoutAsChild` (child) and this helper maps that to the right session.
  const open = useCallback(
    (children: ReactNode, session: OverlaySystemFlyoutOpenOptions['session']) => {
      const properties: OverlaySystemFlyoutOpenOptions = {
        ...defaultDocumentFlyoutProperties,
        historyKey,
        session,
      };
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>,
        }),
        properties
      );
    },
    [overlays, services, store, history, defaultDocumentFlyoutProperties, historyKey]
  );

  const openNetworkFlyout = useCallback(
    ({ ip, flowTarget }: OpenNetworkFlyoutParams) => {
      open(<Network ip={ip} flowTarget={flowTarget} />, 'start');
    },
    [open]
  );

  const openNetworkFlyoutAsChild = useCallback(
    ({ ip, flowTarget }: OpenNetworkFlyoutParams) => {
      open(<Network ip={ip} flowTarget={flowTarget} />, 'inherit');
    },
    [open]
  );

  return useMemo(
    () => ({ openNetworkFlyout, openNetworkFlyoutAsChild }),
    [openNetworkFlyout, openNetworkFlyoutAsChild]
  );
};
