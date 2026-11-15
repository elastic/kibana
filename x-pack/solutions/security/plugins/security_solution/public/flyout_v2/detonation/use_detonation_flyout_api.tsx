/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useMemo } from 'react';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { FLYOUT_SESSION_KIND } from '../../common/lib/telemetry';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import { useFlyoutSessionContext } from '../session_context';
import { DETONATION_REPORT_TITLE } from './translations';

// Lazy-loaded so the report only loads when the flyout is opened.
const DetonationReport = lazy(() =>
  import('./main').then((m) => ({ default: m.DetonationReport }))
);

export interface DetonationFlyoutApi {
  /**
   * Opens the detonation report flyout as a child of the currently open flyout (nested in its
   * history stack, so the back button returns to it). Prototype: not persisted in the URL.
   */
  openDetonationFlyoutAsChild: () => void;
}

/**
 * Developer-facing API to open the detonation report flyout (prototype with fake data).
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useDetonationFlyoutApi = (): DetonationFlyoutApi => {
  const { historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const openFlyout = useOpenFlyout();

  const openDetonationFlyoutAsChild = useCallback(() => {
    const properties: OverlaySystemFlyoutOpenOptions = {
      ...defaultDocumentFlyoutProperties,
      historyKey,
      session: FLYOUT_SESSION_KIND.INHERIT,
      title: buildFlyoutNavTitle(DETONATION_REPORT_TITLE),
    };
    openFlyout(<DetonationReport />, properties, undefined, FLYOUT_SESSION_KIND.INHERIT);
  }, [openFlyout, defaultDocumentFlyoutProperties, historyKey]);

  return useMemo(() => ({ openDetonationFlyoutAsChild }), [openDetonationFlyoutAsChild]);
};
