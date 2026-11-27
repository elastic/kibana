/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useMemo, useRef } from 'react';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FLYOUT_SESSION_KIND } from '../../common/lib/telemetry';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import { useFlyoutSessionContext } from '../session_context';
import { useKibana } from '../../common/lib/kibana';
import { startDetonationJob } from './detonation_jobs';
import { DETONATION_COMPLETE_TITLE, DetonationCompleteToastContent } from './submitted_toast';
import { DETONATION_REPORT_TITLE } from './translations';

// Lazy-loaded so the report only loads when the flyout is opened.
const DetonationReport = lazy(() =>
  import('./main').then((m) => ({ default: m.DetonationReport }))
);

export interface OpenDetonationFlyoutParams {
  /** Show the existing report straight away, without the "Detonating" step. */
  skipDetonation?: boolean;
}

export interface DetonationFlyoutApi {
  /**
   * Opens the detonation report flyout as a new, top-level flyout (fresh session). Use this from
   * outside any flyout, e.g. the Detonate page.
   */
  openDetonationFlyout: (params?: OpenDetonationFlyoutParams) => void;
  /**
   * Opens the detonation report flyout as a child of the currently open flyout (nested in its
   * history stack, so the back button returns to it). Prototype: not persisted in the URL.
   */
  openDetonationFlyoutAsChild: (params?: OpenDetonationFlyoutParams) => void;
}

/**
 * Developer-facing API to open the detonation report flyout (prototype with fake data).
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useDetonationFlyoutApi = (): DetonationFlyoutApi => {
  const { historyKey, session: sessionMode } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const openFlyout = useOpenFlyout();
  const kibanaServices = useKibana().services;
  const openDetonationFlyoutRef = useRef<(params?: OpenDetonationFlyoutParams) => void>();

  // When a detonation finishes, tell the user with a toast whose button opens the report. This
  // runs even if the flyout that started the detonation was closed in the meantime.
  const startJob = useCallback(
    (skipDetonation: boolean): string | undefined => {
      if (skipDetonation) {
        return undefined;
      }
      return startDetonationJob(() => {
        const { notifications } = kibanaServices;
        const toast = notifications.toasts.addSuccess({
          title: DETONATION_COMPLETE_TITLE,
          text: toMountPoint(
            <DetonationCompleteToastContent
              onView={() => {
                notifications.toasts.remove(toast);
                openDetonationFlyoutRef.current?.({ skipDetonation: true });
              }}
            />,
            kibanaServices
          ),
          toastLifeTimeMs: 30000,
        });
      });
    },
    [kibanaServices]
  );

  const openDetonationFlyoutAsChild = useCallback(
    ({ skipDetonation = false }: OpenDetonationFlyoutParams = {}) => {
      const properties: OverlaySystemFlyoutOpenOptions = {
        ...defaultDocumentFlyoutProperties,
        historyKey,
        session: FLYOUT_SESSION_KIND.INHERIT,
        title: buildFlyoutNavTitle(DETONATION_REPORT_TITLE),
      };
      openFlyout(
        <DetonationReport skipDetonation={skipDetonation} jobId={startJob(skipDetonation)} />,
        properties,
        undefined,
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [openFlyout, defaultDocumentFlyoutProperties, historyKey, startJob]
  );

  const openDetonationFlyout = useCallback(
    ({ skipDetonation = false }: OpenDetonationFlyoutParams = {}) => {
      const properties: OverlaySystemFlyoutOpenOptions = {
        ...defaultDocumentFlyoutProperties,
        historyKey,
        session: sessionMode,
        title: DETONATION_REPORT_TITLE,
      };
      openFlyout(
        <DetonationReport skipDetonation={skipDetonation} jobId={startJob(skipDetonation)} />,
        properties,
        undefined,
        sessionMode
      );
    },
    [openFlyout, defaultDocumentFlyoutProperties, historyKey, sessionMode, startJob]
  );
  openDetonationFlyoutRef.current = openDetonationFlyout;

  return useMemo(
    () => ({ openDetonationFlyout, openDetonationFlyoutAsChild }),
    [openDetonationFlyout, openDetonationFlyoutAsChild]
  );
};
