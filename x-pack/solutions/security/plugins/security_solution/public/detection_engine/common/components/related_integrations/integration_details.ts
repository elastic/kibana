/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import semver from 'semver';

import type { Integration } from '../../../../../common/api/detection_engine/fleet_integrations';
import type {
  RelatedIntegration,
  RelatedIntegrationArray,
} from '../../../../../common/api/detection_engine/model/rule_schema';

export interface IntegrationDetails {
  packageName: string;
  integrationName: string | null;
  integrationTitle: string;

  requiredVersion: string;
  targetVersion: string;
  targetUrl: string;

  installationStatus: KnownInstallationStatus | UnknownInstallationStatus;
}

export interface KnownInstallationStatus {
  isKnown: true;
  isInstalled: boolean;
  isEnabled: boolean;
  isVersionMismatch: boolean;
  installedVersion: string;
}

export interface UnknownInstallationStatus {
  isKnown: false;
}

/**
 * Given an array of integrations and an array of all known integrations this will return an
 * array of integrations augmented with details like targetVersion, and `version_satisfied`
 * has.
 */
export const calculateIntegrationDetails = (
  relatedIntegrations: RelatedIntegrationArray,
  knownIntegrations: Integration[] | undefined
): IntegrationDetails[] => {
  const integrationMatches = findIntegrationMatches(relatedIntegrations, knownIntegrations);
  const integrationDetails = integrationMatches.map((integration) =>
    createIntegrationDetails(integration)
  );

  return integrationDetails.sort((a, b) => a.integrationTitle.localeCompare(b.integrationTitle));
};

interface IntegrationMatch {
  related: RelatedIntegration;
  found?: Integration;
  isLoaded: boolean;
}

const findIntegrationMatches = (
  relatedIntegrations: RelatedIntegrationArray,
  integrations: Integration[] | undefined
): IntegrationMatch[] => {
  const integrationsMap = new Map(
    (integrations ?? []).map((integration) => [
      `${integration.package_name}${integration.integration_name ?? ''}`,
      integration,
    ])
  );

  return relatedIntegrations.map((ri: RelatedIntegration) => {
    const key = `${ri.package}${ri.integration ?? ''}`;
    const matchIntegration = integrationsMap.get(key);

    if (!matchIntegration) {
      return {
        related: ri,
        isLoaded: false,
      };
    }

    return {
      related: ri,
      found: matchIntegration,
      isLoaded: true,
    };
  });
};

const createIntegrationDetails = (integration: IntegrationMatch): IntegrationDetails => {
  const { related, found, isLoaded } = integration;

  const packageName = related.package;
  const integrationName = related.integration ?? null;
  const requiredVersion = related.version;

  // We don't know whether the integration is installed or not.
  if (!isLoaded) {
    const integrationTitle = getCapitalizedTitle(packageName, integrationName);
    const targetVersion = getMinimumConcreteVersionMatchingSemver(requiredVersion);
    const targetUrl = buildTargetUrl(packageName, integrationName, targetVersion);

    return {
      packageName,
      integrationName,
      integrationTitle,
      requiredVersion,
      targetVersion,
      targetUrl,
      installationStatus: {
        isKnown: false,
      },
    };
  }

  if (!found) {
    const integrationTitle = getCapitalizedTitle(packageName, integrationName);
    const targetVersion = getMinimumConcreteVersionMatchingSemver(requiredVersion);
    const targetUrl = buildTargetUrl(packageName, integrationName, targetVersion);

    return {
      packageName,
      integrationName,
      integrationTitle,
      requiredVersion,
      targetVersion,
      targetUrl,
      installationStatus: {
        isKnown: true,
        isInstalled: false,
        isEnabled: false,
        isVersionMismatch: false,
        installedVersion: '',
      },
    };
  }

  const integrationTitle = found.integration_title ?? found.package_title;
  // Version check e.g. installed version `1.2.3` satisfies required version `~1.2.1`
  const installedVersion = found.installed_package_version ?? '';
  const isVersionSatisfied = installedVersion
    ? semver.satisfies(installedVersion, requiredVersion, { includePrerelease: true })
    : true;
  const targetVersion =
    installedVersion && isVersionSatisfied
      ? installedVersion
      : getMinimumConcreteVersionMatchingSemver(requiredVersion);

  const targetUrl = buildTargetUrl(packageName, integrationName, targetVersion);

  return {
    packageName,
    integrationName,
    integrationTitle,
    requiredVersion,
    targetVersion,
    targetUrl,
    installationStatus: {
      isKnown: true,
      isInstalled: found.is_installed,
      isEnabled: found.is_enabled,
      isVersionMismatch: !isVersionSatisfied,
      installedVersion,
    },
  };
};

const getCapitalizedTitle = (packageName: string, integrationName: string | null): string => {
  return integrationName == null
    ? `${capitalize(packageName)}`
    : `${capitalize(packageName)} ${capitalize(integrationName)}`;
};

const getMinimumConcreteVersionMatchingSemver = (semverString: string): string => {
  return semver.valid(semver.coerce(semverString)) ?? '';
};

const buildTargetUrl = (
  packageName: string,
  integrationName: string | null,
  targetVersion: string
): string => {
  const packageSegment = targetVersion ? `${packageName}-${targetVersion}` : packageName;
  const query = integrationName ? `?integration=${integrationName}` : '';
  return `app/integrations/detail/${packageSegment}/overview${query}`;
};
