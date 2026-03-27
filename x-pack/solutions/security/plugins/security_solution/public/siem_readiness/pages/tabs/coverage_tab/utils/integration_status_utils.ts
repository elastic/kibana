/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemReadinessPackageInfo } from '@kbn/siem-readiness';
import {
  INTEGRATIONS_INSTALLED_TOOLTIP,
  INTEGRATIONS_UNINSTALLED_TOOLTIP,
  INTEGRATIONS_ENABLED_TOOLTIP,
  INTEGRATIONS_ENABLED,
  INTEGRATIONS_DISABLED,
  INTEGRATIONS_UNINSTALLED,
} from '../../../../../detection_engine/common/components/related_integrations/translations';

export interface IntegrationStatusInfo {
  status: string;
  badgeColor: string;
  tooltip: string;
}

export type IntegrationStatusMap = Map<string, IntegrationStatusInfo>;

/**
 * Creates a status map for integrations based on package information
 * @param packages - Array of package information
 * @returns Map of package name to status information
 */
export const createIntegrationStatusMapFromPackages = (
  packages: SiemReadinessPackageInfo[]
): IntegrationStatusMap => {
  const map: IntegrationStatusMap = new Map();

  packages.forEach((pkg) => {
    const isInstalled = pkg.status === 'installed';
    const hasActivePolicies = (pkg.packagePoliciesInfo?.count ?? 0) > 0;

    if (isInstalled && hasActivePolicies) {
      // Installed and enabled
      map.set(pkg.name, {
        status: INTEGRATIONS_ENABLED,
        badgeColor: 'success',
        tooltip: INTEGRATIONS_ENABLED_TOOLTIP,
      });
    } else if (isInstalled && !hasActivePolicies) {
      // Installed but disabled
      map.set(pkg.name, {
        status: INTEGRATIONS_DISABLED,
        badgeColor: 'primary',
        tooltip: INTEGRATIONS_INSTALLED_TOOLTIP,
      });
    } else {
      // Not installed
      map.set(pkg.name, {
        status: INTEGRATIONS_UNINSTALLED,
        badgeColor: 'default',
        tooltip: INTEGRATIONS_UNINSTALLED_TOOLTIP,
      });
    }
  });

  return map;
};

/**
 * Creates a status map for integrations based on enabled and disabled package sets
 * @param integrationNames - Array of integration names to map
 * @param enabledPackagesSet - Set of enabled package names
 * @param disabledPackagesSet - Set of disabled package names
 * @returns Map of package name to status information
 */
export const createIntegrationStatusMapFromSets = (
  integrationNames: string[],
  enabledPackagesSet: Set<string>,
  disabledPackagesSet: Set<string>
): IntegrationStatusMap => {
  const map: IntegrationStatusMap = new Map();

  integrationNames.forEach((name) => {
    if (enabledPackagesSet.has(name)) {
      // Enabled integration
      map.set(name, {
        status: INTEGRATIONS_ENABLED,
        badgeColor: 'success',
        tooltip: INTEGRATIONS_ENABLED_TOOLTIP,
      });
    } else if (disabledPackagesSet.has(name)) {
      // Disabled integration
      map.set(name, {
        status: INTEGRATIONS_DISABLED,
        badgeColor: 'primary',
        tooltip: INTEGRATIONS_INSTALLED_TOOLTIP,
      });
    } else {
      // Not installed
      map.set(name, {
        status: INTEGRATIONS_UNINSTALLED,
        badgeColor: 'default',
        tooltip: INTEGRATIONS_UNINSTALLED_TOOLTIP,
      });
    }
  });

  return map;
};
