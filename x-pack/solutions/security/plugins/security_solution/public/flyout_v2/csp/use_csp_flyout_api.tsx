/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useMemo } from 'react';
import type { OpenFindingInSystemFlyoutHandle } from '@kbn/cloud-security-posture-plugin/public';
import type { FlyoutOrigin } from '../../common/lib/telemetry';
import { FLYOUT_SESSION_KIND, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../common/lib/telemetry';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import { useFlyoutSessionContext } from '../session_context';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import type { MisconfigurationProps } from './misconfiguration/main';
import type { VulnerabilityProps } from './vulnerability/main';

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
  /** Which UI trigger opened this flyout, when known. */
  origin?: FlyoutOrigin;
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
 * provider wiring (`flyoutProviders` + `overlays.openSystemFlyout`, via `useOpenFlyout`) and the
 * flyout properties so call sites don't repeat them. `useOpenFlyout` also reports open/close
 * telemetry for every method below.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout, nor
 * about the cloud security posture plugin's `CspSecuritySolutionContext` contract: callers remain
 * responsible for gating on `useIsNewFlyoutEnabled()` and adapting this to that contract (see
 * `useOpenFindingInSystemFlyout` in `cloud_security_posture/hooks`).
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useCspFlyoutApi = (): CspFlyoutApi => {
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const open = useOpenFlyout();

  const openMisconfigurationFinding = useCallback(
    (params: MisconfigurationProps): OpenFindingInSystemFlyoutHandle => {
      const ref = open(
        <Misconfiguration {...params} />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: sessionMode },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.MISCONFIGURATION,
          session: sessionMode,
        }
      );
      return { close: () => ref.close(), onClose: ref.onClose };
    },
    [open, defaultDocumentFlyoutProperties, historyKey, sessionMode]
  );

  const openMisconfigurationFindingAsChild = useCallback(
    (
      params: MisconfigurationProps,
      options?: OpenCspFindingAsChildOptions
    ): OpenFindingInSystemFlyoutHandle => {
      const ref = open(
        <Misconfiguration {...params} />,
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.INHERIT,
          title: options?.title ? buildFlyoutNavTitle(options.title) : undefined,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.MISCONFIGURATION,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin: options?.origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
      return { close: () => ref.close(), onClose: ref.onClose };
    },
    [open, defaultDocumentFlyoutProperties, historyKey]
  );

  const openVulnerabilityFinding = useCallback(
    (params: VulnerabilityProps): OpenFindingInSystemFlyoutHandle => {
      const ref = open(
        <Vulnerability {...params} />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: sessionMode },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.VULNERABILITY,
          session: sessionMode,
        }
      );
      return { close: () => ref.close(), onClose: ref.onClose };
    },
    [open, defaultDocumentFlyoutProperties, historyKey, sessionMode]
  );

  const openVulnerabilityFindingAsChild = useCallback(
    (
      params: VulnerabilityProps,
      options?: OpenCspFindingAsChildOptions
    ): OpenFindingInSystemFlyoutHandle => {
      const ref = open(
        <Vulnerability {...params} />,
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.INHERIT,
          title: options?.title ? buildFlyoutNavTitle(options.title) : undefined,
        },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.VULNERABILITY,
          session: FLYOUT_SESSION_KIND.INHERIT,
          origin: options?.origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
      return { close: () => ref.close(), onClose: ref.onClose };
    },
    [open, defaultDocumentFlyoutProperties, historyKey]
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
