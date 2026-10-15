/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { OpenFindingInSystemFlyoutHandle } from '@kbn/cloud-security-posture-plugin/public';
import type { FlyoutOrigin } from '../../common/lib/telemetry';
import { FLYOUT_SESSION_KIND, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../common/lib/telemetry';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import { useFlyoutSessionContext } from '../session_context';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import type { MisconfigurationProps } from './misconfiguration/main';
import type { VulnerabilityProps } from './vulnerability/main';
import { useFlyoutV2UrlWriter } from '../shared/url_state/flyout_v2_url_writer';
import {
  FLYOUT_DESCRIPTOR_KIND,
  decodeFlyoutV2UrlParam,
  urlParamKeyForHistoryKey,
} from '../shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../shared/url_state/flyout_v2_url_param';

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
  const history = useHistory();
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const open = useOpenFlyout();
  const urlParamKey = urlParamKeyForHistoryKey(historyKey);
  const { writeOnOpen, buildOnClose } = useFlyoutV2UrlWriter(urlParamKey, historyKey);

  const readFirstDescriptor = useCallback((): FlyoutDescriptor | null => {
    if (!history?.location) return null;
    const raw = new URLSearchParams(history.location.search).get(urlParamKey);
    const stack = decodeFlyoutV2UrlParam(raw);
    return stack?.[0] ?? null;
  }, [history, urlParamKey]);

  const openMisconfigurationFinding = useCallback(
    (params: MisconfigurationProps): OpenFindingInSystemFlyoutHandle => {
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.cspMisconfiguration,
        resourceId: params.resourceId,
        ruleId: params.ruleId,
      });
      const onClose = buildOnClose(null);
      const ref = open(
        <Misconfiguration {...params} />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: sessionMode, onClose },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.MISCONFIGURATION,
          session: sessionMode,
        }
      );
      return { close: () => ref.close(), onClose: ref.onClose };
    },
    [open, defaultDocumentFlyoutProperties, historyKey, sessionMode, writeOnOpen, buildOnClose]
  );

  const openMisconfigurationFindingAsChild = useCallback(
    (
      params: MisconfigurationProps,
      options?: OpenCspFindingAsChildOptions
    ): OpenFindingInSystemFlyoutHandle => {
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(
        {
          kind: FLYOUT_DESCRIPTOR_KIND.cspMisconfiguration,
          resourceId: params.resourceId,
          ruleId: params.ruleId,
        },
        'inherit'
      );
      const onClose = buildOnClose(parentDescriptor);
      const ref = open(
        <Misconfiguration {...params} />,
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.INHERIT,
          title: options?.title ? buildFlyoutNavTitle(options.title) : undefined,
          onClose,
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
    [
      open,
      defaultDocumentFlyoutProperties,
      historyKey,
      readFirstDescriptor,
      writeOnOpen,
      buildOnClose,
    ]
  );

  const openVulnerabilityFinding = useCallback(
    (params: VulnerabilityProps): OpenFindingInSystemFlyoutHandle => {
      writeOnOpen({
        kind: FLYOUT_DESCRIPTOR_KIND.cspVulnerability,
        vulnerabilityId: params.vulnerabilityId,
        resourceId: params.resourceId,
        packageName: params.packageName,
        packageVersion: params.packageVersion,
        eventId: params.eventId,
      });
      const onClose = buildOnClose(null);
      const ref = open(
        <Vulnerability {...params} />,
        { ...defaultDocumentFlyoutProperties, historyKey, session: sessionMode, onClose },
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.VULNERABILITY,
          session: sessionMode,
        }
      );
      return { close: () => ref.close(), onClose: ref.onClose };
    },
    [open, defaultDocumentFlyoutProperties, historyKey, sessionMode, writeOnOpen, buildOnClose]
  );

  const openVulnerabilityFindingAsChild = useCallback(
    (
      params: VulnerabilityProps,
      options?: OpenCspFindingAsChildOptions
    ): OpenFindingInSystemFlyoutHandle => {
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen(
        {
          kind: FLYOUT_DESCRIPTOR_KIND.cspVulnerability,
          vulnerabilityId: params.vulnerabilityId,
          resourceId: params.resourceId,
          packageName: params.packageName,
          packageVersion: params.packageVersion,
          eventId: params.eventId,
        },
        'inherit'
      );
      const onClose = buildOnClose(parentDescriptor);
      const ref = open(
        <Vulnerability {...params} />,
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.INHERIT,
          title: options?.title ? buildFlyoutNavTitle(options.title) : undefined,
          onClose,
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
    [
      open,
      defaultDocumentFlyoutProperties,
      historyKey,
      readFirstDescriptor,
      writeOnOpen,
      buildOnClose,
    ]
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
