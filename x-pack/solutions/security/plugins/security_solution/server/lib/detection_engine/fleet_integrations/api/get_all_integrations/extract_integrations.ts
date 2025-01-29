/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import type { PackageList, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Integration } from '../../../../../../common/api/detection_engine/fleet_integrations/model/integrations';

export function extractIntegrations(
  packages: PackageList,
  packagePolicies: PackagePolicy[]
): Integration[] {
  const result: Integration[] = [];
  const enabledIntegrationsSet = extractEnabledIntegrations(packagePolicies);

  for (const fleetPackage of packages) {
    const packageName = fleetPackage.name;
    const packageTitle = fleetPackage.title;
    const isPackageInstalled = fleetPackage.status === 'installed';
    // Actual `installed_version` is buried in SO, root `version` is latest package version available
    const installedPackageVersion = fleetPackage.savedObject?.attributes.install_version;
    // Policy templates correspond to package's integrations.
    const packagePolicyTemplates = fleetPackage.policy_templates ?? [];

    for (const policyTemplate of packagePolicyTemplates) {
      const integrationName = policyTemplate.name;

      if (integrationName !== packageName) {
        const integrationId = getIntegrationId(packageName, integrationName);
        const integrationTitle = `${packageTitle} ${capitalize(policyTemplate.title)}`;
        const integration: Integration = {
          package_name: packageName,
          package_title: packageTitle,
          latest_package_version: fleetPackage.version,
          installed_package_version: installedPackageVersion,
          integration_name: integrationName,
          integration_title: integrationTitle,
          is_installed: isPackageInstalled, // All integrations installed as a part of the package
          is_enabled: enabledIntegrationsSet.has(integrationId),
        };

        result.push(integration);
      }
    }

    // There are two edge cases here
    //
    // - (1) Some prebuilt rules don't use integration name when there is just
    //   one integration per package, e.g. "Web Application Suspicious Activity:
    //   Unauthorized Method" refers "apm" package name while apm package has
    //   "apmserver" integration
    //
    // - (2) Some packages don't have policy templates at all,
    //   e.g. "Lateral Movement Detection"
    if (packagePolicyTemplates.length <= 1) {
      result.push({
        package_name: packageName,
        package_title: packageTitle,
        latest_package_version: fleetPackage.version,
        installed_package_version: installedPackageVersion,
        is_installed: isPackageInstalled,
        is_enabled: enabledIntegrationsSet.has(getIntegrationId(packageName, '')),
      });
    }
  }

  return result;
}

function extractEnabledIntegrations(packagePolicies: PackagePolicy[]): Set<string> {
  const enabledIntegrations = new Set<string>();

  for (const packagePolicy of packagePolicies) {
    for (const input of packagePolicy.inputs) {
      if (input.enabled) {
        const packageName = packagePolicy.package?.name.trim() ?? ''; // e.g. 'cloudtrail'
        const integrationName = (input.policy_template ?? input.type ?? '').trim(); // e.g. 'cloudtrail'
        const enabledIntegrationKey = `${packageName}${integrationName}`;

        enabledIntegrations.add(enabledIntegrationKey);
      }
    }

    // Base package may not have policy template, so pull directly from `policy.package` if so
    if (packagePolicy.package) {
      const packageName = packagePolicy.package.name.trim();

      enabledIntegrations.add(packageName);
    }
  }

  return enabledIntegrations;
}

function getIntegrationId(packageName: string, integrationName: string): string {
  return `${packageName}${integrationName}`;
}
