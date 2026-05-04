/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelatedIntegration, RelatedIntegrationRuleResponse } from './types';

export interface RuleIntegrationCoverage {
  coveredRules: RelatedIntegrationRuleResponse[];
  uncoveredRules: RelatedIntegrationRuleResponse[];
  missingIntegrations: string[];
  installedIntegrations: string[];
  relatedIntegrations: RelatedIntegration[];
}

/**
 * Given a list of detection rules and installed integration package names, returns
 * which rules are covered (at least one required integration is installed) and which
 * are not, along with the set of missing integrations.
 *
 * A rule with no `related_integrations` is always considered covered.
 */
export const getRuleIntegrationCoverage = (
  rules: RelatedIntegrationRuleResponse[],
  installedIntegrationPackages: string[]
): RuleIntegrationCoverage => {
  const installedSet = new Set(installedIntegrationPackages);
  const referencedIntegrations = new Set<string>();
  const relatedIntegrationsMap = new Map<string, RelatedIntegration>();

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

    // A rule is considered covered if ANY required integration is installed
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
