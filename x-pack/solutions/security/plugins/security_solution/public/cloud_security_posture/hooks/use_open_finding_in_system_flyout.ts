/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { OpenFindingInSystemFlyout } from '@kbn/cloud-security-posture-plugin/public';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';

/**
 * Adapts the security solution's `useFlyoutApi` facade to the shape the cloud security posture
 * plugin expects from its `CspSecuritySolutionContext.useOpenFindingInSystemFlyout` contract.
 */
export const useOpenFindingInSystemFlyout = (): OpenFindingInSystemFlyout => {
  const { openMisconfigurationFinding, openVulnerabilityFinding } = useFlyoutApi();

  return useMemo(
    () => ({ openMisconfigurationFinding, openVulnerabilityFinding }),
    [openMisconfigurationFinding, openVulnerabilityFinding]
  );
};
