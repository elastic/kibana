/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { OpenFindingInSystemFlyout } from '@kbn/cloud-security-posture-plugin/public';
import { useIsNewFlyoutEnabled } from '../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';

/**
 * Adapts the security solution's `useFlyoutApi` facade to the shape the cloud security posture
 * plugin expects from its `CspSecuritySolutionContext.useOpenFindingInSystemFlyout` contract.
 *
 * Returns `undefined` when the new flyout system is disabled, so the CSP plugin falls back to its
 * legacy expandable-flyout panels. The CSP plugin cannot call `useIsNewFlyoutEnabled` itself, since
 * it lives in security solution internals — this hook does that gating on its behalf.
 */
export const useOpenFindingInSystemFlyout = (): OpenFindingInSystemFlyout | undefined => {
  const newFlyoutSystemEnabled = useIsNewFlyoutEnabled();
  const { openMisconfigurationFinding, openVulnerabilityFinding } = useFlyoutApi();

  return useMemo(
    () =>
      newFlyoutSystemEnabled
        ? { openMisconfigurationFinding, openVulnerabilityFinding }
        : undefined,
    [newFlyoutSystemEnabled, openMisconfigurationFinding, openVulnerabilityFinding]
  );
};
