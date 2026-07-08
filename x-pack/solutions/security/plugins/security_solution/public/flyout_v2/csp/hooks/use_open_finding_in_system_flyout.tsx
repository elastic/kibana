/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import type {
  OpenFindingInSystemFlyout,
  OpenFindingInSystemFlyoutHandle,
} from '@kbn/cloud-security-posture-plugin/public';
import { useKibana } from '../../../common/lib/kibana';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import type { MisconfigurationProps } from '../misconfiguration/main';
import { Misconfiguration } from '../misconfiguration/main';
import type { VulnerabilityProps } from '../vulnerability/main';
import { Vulnerability } from '../vulnerability/main';

/**
 * Provides openers that render a CSP finding as a primary security solution "system flyout"
 * (the v2 flyout). Returns `undefined` when the new flyout system is disabled,
 * so callers can fall back to the legacy expandable-flyout panels.
 *
 * This is injected into the cloud security posture plugin via the `CspSecuritySolutionContext`
 * contract, since the CSP plugin cannot depend on security solution internals directly.
 */
export const useOpenFindingInSystemFlyout = (): OpenFindingInSystemFlyout | undefined => {
  const newFlyoutSystemEnabled = useIsNewFlyoutEnabled();
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const openMisconfigurationFinding = useCallback(
    (params: MisconfigurationProps): OpenFindingInSystemFlyoutHandle => {
      const flyoutRef = overlays.openSystemFlyout(
        flyoutProviders({ services, store, history, children: <Misconfiguration {...params} /> }),
        { ...defaultDocumentFlyoutProperties, session: 'start' }
      );
      return { close: () => flyoutRef.close(), onClose: flyoutRef.onClose };
    },
    [overlays, services, store, history, defaultDocumentFlyoutProperties]
  );

  const openVulnerabilityFinding = useCallback(
    (params: VulnerabilityProps): OpenFindingInSystemFlyoutHandle => {
      const flyoutRef = overlays.openSystemFlyout(
        flyoutProviders({ services, store, history, children: <Vulnerability {...params} /> }),
        { ...defaultDocumentFlyoutProperties, session: 'start' }
      );
      return { close: () => flyoutRef.close(), onClose: flyoutRef.onClose };
    },
    [overlays, services, store, history, defaultDocumentFlyoutProperties]
  );

  return useMemo(
    () =>
      newFlyoutSystemEnabled
        ? { openMisconfigurationFinding, openVulnerabilityFinding }
        : undefined,
    [newFlyoutSystemEnabled, openMisconfigurationFinding, openVulnerabilityFinding]
  );
};
