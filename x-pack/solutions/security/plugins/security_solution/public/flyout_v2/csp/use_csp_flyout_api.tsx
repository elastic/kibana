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
import type { OpenFindingInSystemFlyoutHandle } from '@kbn/cloud-security-posture-plugin/public';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';
import { FlyoutSessionContextProvider, useFlyoutSessionContext } from '../session_context';
import type { MisconfigurationProps } from './misconfiguration/main';
import type { VulnerabilityProps } from './vulnerability/main'; // Lazy-loaded so consumers of this hook don't statically pull the CSP finding flyout graph into

// Lazy-loaded so consumers of this hook don't statically pull the CSP finding flyout graph into
// their bundle; the chunk only loads when a finding is actually opened.
const Misconfiguration = lazy(() =>
  import('./misconfiguration/main').then((m) => ({ default: m.Misconfiguration }))
);
const Vulnerability = lazy(() =>
  import('./vulnerability/main').then((m) => ({ default: m.Vulnerability }))
);

export interface OpenCspFindingAsChildOptions {
  /** Optional title shown in the flyout system's history menu for this child flyout. */
  title?: string;
}

export interface CspFlyoutApi {
  /**
   * Opens the misconfiguration finding flyout as a new, top-level flyout (starting a fresh session).
   * Use this from outside any flyout — e.g. a table row, a case attachment.
   */
  openMisconfigurationFinding: (params: MisconfigurationProps) => OpenFindingInSystemFlyoutHandle;
  /**
   * Opens the misconfiguration finding flyout as a child of the currently open flyout (nested in its
   * history stack, so the back button returns to it). Use this from within an already-open flyout
   * — e.g. an entity insight tool.
   */
  openMisconfigurationFindingAsChild: (
    params: MisconfigurationProps,
    options?: OpenCspFindingAsChildOptions
  ) => OpenFindingInSystemFlyoutHandle;
  /**
   * Opens the vulnerability finding flyout as a new, top-level flyout (starting a fresh session).
   * Use this from outside any flyout — e.g. a table row, a case attachment.
   */
  openVulnerabilityFinding: (params: VulnerabilityProps) => OpenFindingInSystemFlyoutHandle;
  /**
   * Opens the vulnerability finding flyout as a child of the currently open flyout (nested in its
   * history stack, so the back button returns to it). Use this from within an already-open flyout
   * — e.g. an entity insight tool.
   */
  openVulnerabilityFindingAsChild: (
    params: VulnerabilityProps,
    options?: OpenCspFindingAsChildOptions
  ) => OpenFindingInSystemFlyoutHandle;
}

/**
 * Developer-facing API to open the new (EUI-based) CSP finding flyouts, in the same mindset as
 * `useExpandableFlyoutApi`, `useIocFlyoutApi`, `useNetworkFlyoutApi`, etc. It encapsulates the
 * provider wiring (`flyoutProviders` + `overlays.openSystemFlyout`) and the flyout properties so
 * call sites don't repeat them.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout, nor
 * about the cloud security posture plugin's `CspSecuritySolutionContext` contract: callers remain
 * responsible for gating on `useIsNewFlyoutEnabled()` and adapting this to that contract (see
 * `useOpenFindingInSystemFlyout` in `cloud_security_posture/hooks`).
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useCspFlyoutApi = (): CspFlyoutApi => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const mainFlyoutSessionMode = useFlyoutSessionContext();

  // `session` (and, for child flyouts, an optional history `title`) are the only things that differ
  // between a main and a child open. Kept private here so callers never reason about them: they pick
  // the main or `...AsChild` method and this helper opens the system flyout and wraps the resulting
  // overlay ref into the `OpenFindingInSystemFlyoutHandle` contract callers use to close it / react
  // to its closing.
  const open = useCallback(
    (
      children: ReactNode,
      session: OverlaySystemFlyoutOpenOptions['session'],
      title?: string
    ): OpenFindingInSystemFlyoutHandle => {
      const flyoutRef = overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <FlyoutSessionContextProvider
              value={session === 'inherit' ? 'inherit' : mainFlyoutSessionMode}
            >
              <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>
            </FlyoutSessionContextProvider>
          ),
        }),
        { ...defaultDocumentFlyoutProperties, historyKey, session, title }
      );
      return { close: () => flyoutRef.close(), onClose: flyoutRef.onClose };
    },
    [
      overlays,
      services,
      store,
      history,
      defaultDocumentFlyoutProperties,
      historyKey,
      mainFlyoutSessionMode,
    ]
  );

  const openMisconfigurationFinding = useCallback(
    (params: MisconfigurationProps) =>
      open(<Misconfiguration {...params} />, mainFlyoutSessionMode),
    [open, mainFlyoutSessionMode]
  );

  const openMisconfigurationFindingAsChild = useCallback(
    (params: MisconfigurationProps, options?: OpenCspFindingAsChildOptions) =>
      open(<Misconfiguration {...params} />, 'inherit', options?.title),
    [open]
  );

  const openVulnerabilityFinding = useCallback(
    (params: VulnerabilityProps) => open(<Vulnerability {...params} />, mainFlyoutSessionMode),
    [open, mainFlyoutSessionMode]
  );

  const openVulnerabilityFindingAsChild = useCallback(
    (params: VulnerabilityProps, options?: OpenCspFindingAsChildOptions) =>
      open(<Vulnerability {...params} />, 'inherit', options?.title),
    [open]
  );

  return useMemo(
    () => ({
      openMisconfigurationFinding,
      openMisconfigurationFindingAsChild,
      openVulnerabilityFinding,
      openVulnerabilityFindingAsChild,
    }),
    [
      openMisconfigurationFinding,
      openMisconfigurationFindingAsChild,
      openVulnerabilityFinding,
      openVulnerabilityFindingAsChild,
    ]
  );
};
