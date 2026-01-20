/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RelatedIntegrationRuleResponse } from './types';
import { useSiemReadinessApi } from './use_siem_readiness_api';

export interface RuleIntegrationCoverage {
  coveredRules: RelatedIntegrationRuleResponse[];
  uncoveredRules: RelatedIntegrationRuleResponse[];
  missingIntegrations: string[];
  installedIntegrations: string[];
  relatedIntegrations: Array<{ package: string; version?: string; integration?: string }>;
}

export const getRuleIntegrationCoverage = (
  rules: RelatedIntegrationRuleResponse[],
  installedIntegrationPackages: string[]
): RuleIntegrationCoverage => {
  const installedSet = new Set(installedIntegrationPackages);
  const referencedIntegrations = new Set<string>();
  const relatedIntegrationsMap = new Map<
    string,
    { package: string; version?: string; integration?: string }
  >();

  const coveredRules: RelatedIntegrationRuleResponse[] = [];
  const uncoveredRules: RelatedIntegrationRuleResponse[] = [];

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
  const { getDetectionRules } = useSiemReadinessApi();
  const enabledRulesQuery = getDetectionRules;

  const ruleIntegrationCoverage = useMemo(() => {
    if (!enabledRulesQuery.data?.data) {
      return null;
    }

    const installedPackages = Array.isArray(integrationPackages)
      ? integrationPackages
      : [integrationPackages];

    return getRuleIntegrationCoverage(enabledRulesQuery.data.data, installedPackages);
  }, [enabledRulesQuery.data?.data, integrationPackages]);

  return {
    ruleIntegrationCoverage,
  };
};
