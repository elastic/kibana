/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageListItem, PackagePolicy } from '@kbn/fleet-plugin/common';
import { capitalize, flatten } from 'lodash';
import type {
  InstalledIntegration,
  InstalledIntegrationArray,
  InstalledIntegrationBasicInfo,
  InstalledPackage,
  InstalledPackageArray,
  InstalledPackageBasicInfo,
} from '../../../../../../common/api/detection_engine/fleet_integrations';

export interface IInstalledIntegrationSet {
  addPackage(fleetPackage: PackageListItem): void;
  addPackagePolicy(policy: PackagePolicy): void;

  getPackages(): InstalledPackageArray;
  getIntegrations(): InstalledIntegrationArray;
}

type PackageMap = Map<string, PackageInfo>;

interface PackageInfo extends InstalledPackageBasicInfo {
  integrations: Map<string, InstalledIntegrationBasicInfo>;
}

export const createInstalledIntegrationSet = (): IInstalledIntegrationSet => {
  const packageMap: PackageMap = new Map<string, PackageInfo>([]);

  const addPackage = (fleetPackage: PackageListItem): void => {
    if (fleetPackage.type !== 'integration') {
      return;
    }
    if (fleetPackage.status !== 'installed') {
      return;
    }

    const packageKey = `${fleetPackage.name}`;
    const existingPackageInfo = packageMap.get(packageKey);

    if (existingPackageInfo != null) {
      return;
    }

    // Actual `installed_version` is buried in SO, root `version` is latest package version available
    const installedPackageVersion = fleetPackage.savedObject?.attributes.install_version || '';

    // Policy templates correspond to package's integrations.
    const packagePolicyTemplates = fleetPackage.policy_templates ?? [];

    const packageInfo: PackageInfo = {
      package_name: fleetPackage.name,
      package_title: fleetPackage.title,
      package_version: installedPackageVersion,

      integrations: new Map<string, InstalledIntegrationBasicInfo>(
        packagePolicyTemplates.map((pt) => {
          const integrationTitle: string =
            packagePolicyTemplates.length === 1 && pt.name === fleetPackage.name
              ? fleetPackage.title
              : pt.title;

          const integrationInfo: InstalledIntegrationBasicInfo = {
            integration_name: pt.name,
            integration_title: integrationTitle,
            is_enabled: false, // There might not be an integration policy, so default false and later update in addPackagePolicy()
          };

          return [integrationInfo.integration_name, integrationInfo];
        })
      ),
    };

    packageMap.set(packageKey, packageInfo);
  };

  const addPackagePolicy = (policy: PackagePolicy): void => {
    const packageInfo = getPackageInfoFromPolicy(policy);
    const integrationsInfo = getIntegrationsInfoFromPolicy(policy, packageInfo);
    const packageKey = `${packageInfo.package_name}`;
    const existingPackageInfo = packageMap.get(packageKey);

    if (existingPackageInfo == null) {
      const integrationsMap = new Map<string, InstalledIntegrationBasicInfo>();
      integrationsInfo.forEach((integration) => {
        addIntegrationToMap(integrationsMap, integration);
      });

      packageMap.set(packageKey, {
        ...packageInfo,
        integrations: integrationsMap,
      });
    } else {
      integrationsInfo.forEach((integration) => {
        addIntegrationToMap(existingPackageInfo.integrations, integration);
      });
    }
  };

  const getPackages = (): InstalledPackageArray => {
    const packages = Array.from(packageMap.values());
    return packages.map((packageInfo): InstalledPackage => {
      const integrations = Array.from(packageInfo.integrations.values());
      return { ...packageInfo, integrations };
    });
  };

  const getIntegrations = (): InstalledIntegrationArray => {
    const packages = Array.from(packageMap.values());
    return flatten(
      packages.map((packageInfo): InstalledIntegrationArray => {
        const integrations = Array.from(packageInfo.integrations.values());
        return integrations.map((integrationInfo): InstalledIntegration => {
          return packageInfo.package_name === integrationInfo.integration_name
            ? {
                package_name: packageInfo.package_name,
                package_title: packageInfo.package_title,
                package_version: packageInfo.package_version,
                is_enabled: integrationInfo.is_enabled,
              }
            : {
                package_name: packageInfo.package_name,
                package_title: packageInfo.package_title,
                package_version: packageInfo.package_version,
                integration_name: integrationInfo.integration_name,
                integration_title: integrationInfo.integration_title,
                is_enabled: integrationInfo.is_enabled,
              };
        });
      })
    );
  };

  return {
    addPackage,
    addPackagePolicy,
    getPackages,
    getIntegrations,
  };
};

const getPackageInfoFromPolicy = (policy: PackagePolicy): InstalledPackageBasicInfo => {
  return {
    package_name: normalizeString(policy.package?.name),
    package_title: normalizeString(policy.package?.title),
    package_version: normalizeString(policy.package?.version),
  };
};

const getIntegrationsInfoFromPolicy = (
  policy: PackagePolicy,
  packageInfo: InstalledPackageBasicInfo
): InstalledIntegrationBasicInfo[] => {
  // Construct integration info from the available policy_templates
  const integrationInfos = policy.inputs.map((input) => {
    const integrationName = normalizeString(input.policy_template ?? input.type); // e.g. 'cloudtrail'
    const integrationTitle = `${packageInfo.package_title} ${capitalize(integrationName)}`; // e.g. 'AWS Cloudtrail'
    return {
      integration_name: integrationName,
      integration_title: integrationTitle,
      is_enabled: input.enabled,
    };
  });

  // Base package may not have policy template, so pull directly from `policy.package` if so
  return [
    ...integrationInfos,
    ...(policy.package
      ? [
          {
            integration_name: policy.package.name,
            integration_title: policy.package.title,
            is_enabled: true, // Always true if `policy.package` exists since this corresponds to the base package
          },
        ]
      : []),
  ];
};

const normalizeString = (raw: string | null | undefined): string => {
  return (raw ?? '').trim();
};

const addIntegrationToMap = (
  map: Map<string, InstalledIntegrationBasicInfo>,
  integration: InstalledIntegrationBasicInfo
): void => {
  if (!map.has(integration.integration_name) || integration.is_enabled) {
    map.set(integration.integration_name, integration);
  }
};
