/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getRuleIntegrationCoverage } from '@kbn/siem-readiness-common';
import type { RuleIntegrationCoverage } from '@kbn/siem-readiness-common';
import { useSiemReadinessApi } from './use_siem_readiness_api';

export type { RuleIntegrationCoverage };

export const useDetectionRulesByIntegration = (integrationPackages?: string | string[]) => {
  const { getDetectionRules, getIntegrations } = useSiemReadinessApi();
  const enabledRulesQuery = getDetectionRules;
  const integrationItems = getIntegrations?.data?.items;

  const enabledPackages = useMemo(() => {
    if (integrationPackages !== undefined) {
      return Array.isArray(integrationPackages) ? integrationPackages : [integrationPackages];
    }

    const allIntegrationPackages = integrationItems ?? [];
    const enabledPackageNames: string[] = [];

    for (const pkg of allIntegrationPackages) {
      const isInstalled = pkg.status === 'installed';
      const hasPolicies = (pkg.packagePoliciesInfo?.count ?? 0) > 0;

      if (isInstalled && hasPolicies) {
        enabledPackageNames.push(pkg.name);
      }
    }

    return enabledPackageNames;
  }, [integrationPackages, integrationItems]);

  const ruleIntegrationCoverage = useMemo(() => {
    if (!enabledRulesQuery.data?.data) {
      return null;
    }
    return getRuleIntegrationCoverage(enabledRulesQuery.data.data, enabledPackages);
  }, [enabledRulesQuery.data?.data, enabledPackages]);

  const enabledPackagesSet = useMemo(() => new Set(enabledPackages), [enabledPackages]);

  const disabledPackagesSet = useMemo(() => {
    const disabled = new Set<string>();

    for (const pkg of integrationItems ?? []) {
      const isInstalled = pkg.status === 'installed';
      const hasPolicies = (pkg.packagePoliciesInfo?.count ?? 0) > 0;

      if (isInstalled && !hasPolicies) {
        disabled.add(pkg.name);
      }
    }

    return disabled;
  }, [integrationItems]);

  return {
    ruleIntegrationCoverage,
    enabledPackages,
    enabledPackagesSet,
    disabledPackagesSet,
  };
};
