/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { FleetPackage } from './types';

export const useEnabledDetectionRules = () => {
  const { http } = useKibana<CoreStart>().services;

  return useQuery({
    queryKey: ['enabled-detection-rules'],
    queryFn: () =>
      http.get<{ data: FleetPackage[] }>('/api/detection_engine/rules/_find', {
        query: {
          filter: 'alert.attributes.enabled:true',
          per_page: 10000,
        },
      }),
  });
};

export interface RuleIntegrationCoverage {
  coveredRules: FleetPackage[];
  uncoveredRules: FleetPackage[];
  missingIntegrations: string[];
  installedIntegrations: string[];
  relatedIntegrations: Array<{ package: string; version?: string; integration?: string }>;
}

export const getRuleIntegrationCoverage = (
  rules: FleetPackage[],
  installedIntegrationPackages: string[]
): RuleIntegrationCoverage => {
  const installedSet = new Set(installedIntegrationPackages);
  const referencedIntegrations = new Set<string>();
  const relatedIntegrationsMap = new Map<
    string,
    { package: string; version?: string; integration?: string }
  >();

  const coveredRules: FleetPackage[] = [];
  const uncoveredRules: FleetPackage[] = [];

  rules.forEach((rule) => {
    const requiredIntegrations =
      rule.related_integrations?.map((i) => i.package).filter(Boolean) ?? [];

    rule.related_integrations?.forEach((integration) => {
      if (integration.package) {
        referencedIntegrations.add(integration.package);
        relatedIntegrationsMap.set(integration.package, {
          package: integration.package,
          version: integration.version,
        });
      }
    });

    if (requiredIntegrations.length === 0) {
      coveredRules.push(rule);
      return;
    }

    // Current behavior: a rule is considered covered if ANY required integration is installed
    const hasInstalledIntegration = requiredIntegrations.some((pkg) => installedSet.has(pkg));

    if (hasInstalledIntegration) {
      coveredRules.push(rule);
    } else {
      uncoveredRules.push(rule);
    }
  });

  return {
    coveredRules,
    uncoveredRules,
    missingIntegrations: Array.from(referencedIntegrations).filter((pkg) => !installedSet.has(pkg)),
    installedIntegrations: Array.from(installedSet),
    relatedIntegrations: Array.from(relatedIntegrationsMap.values()),
  };
};

export const useDetectionRulesByIntegration = (integrationPackages: string | string[]) => {
  const enabledRulesQuery = useEnabledDetectionRules();

  const analytics = useMemo(() => {
    if (!enabledRulesQuery.data?.data) {
      return null;
    }

    const installedPackages = Array.isArray(integrationPackages)
      ? integrationPackages
      : [integrationPackages];

    return getRuleIntegrationCoverage(enabledRulesQuery.data.data, installedPackages);
  }, [enabledRulesQuery.data?.data, integrationPackages]);

  return {
    ...enabledRulesQuery,
    analytics,
    // Maintain backward compatibility
    data: analytics?.coveredRules,
  };
};
