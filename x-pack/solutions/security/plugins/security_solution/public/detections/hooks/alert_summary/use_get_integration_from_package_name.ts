/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useFetchIntegrations } from './use_fetch_integrations';

export interface UseGetIntegrationFromRuleIdParams {
  /**
   *
   */
  packageName: string | null;
}

export interface UseGetIntegrationFromRuleIdResult {
  /**
   * List of integrations ready to be consumed by the IntegrationFilterButton component
   */
  integration: PackageListItem | undefined;
  /**
   * True while rules are being fetched
   */
  isLoading: boolean;
}

/**
 *
 */
export const useGetIntegrationFromPackageName = ({
  packageName,
}: UseGetIntegrationFromRuleIdParams): UseGetIntegrationFromRuleIdResult => {
  // Fetch all packages
  const { installedPackages, isLoading } = useFetchIntegrations();

  const integration = useMemo(
    () => installedPackages.find((installedPackage) => installedPackage.name === packageName),
    [installedPackages, packageName]
  );

  return useMemo(
    () => ({
      integration,
      isLoading,
    }),
    [integration, isLoading]
  );
};
