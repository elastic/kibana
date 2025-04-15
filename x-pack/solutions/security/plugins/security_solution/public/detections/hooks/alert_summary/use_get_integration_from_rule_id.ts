/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useFetchIntegrations } from './use_fetch_integrations';
import { useFindRulesQuery } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import type { RuleResponse } from '../../../../common/api/detection_engine';

export interface UseGetIntegrationFromRuleIdParams {
  /**
   * Id of the rule. This should be the value from the signal.rule.id field
   */
  ruleId: string | string[];
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
 * Hook that fetches rule and packages data. It then uses that data to find if there is a package (integration)
 * that matches the rule id value passed via prop (value for the signal.rule.id field).
 *
 * This hook is used in the GroupedAlertTable's accordion when grouping by signal.rule.id, to render the title as well as statistics.
 */
export const useGetIntegrationFromRuleId = ({
  ruleId,
}: UseGetIntegrationFromRuleIdParams): UseGetIntegrationFromRuleIdResult => {
  // Fetch all rules. For the AI for SOC effort, there should only be one rule per integration (which means for now 5-6 rules total)
  const { data, isLoading: ruleIsLoading } = useFindRulesQuery({});

  // Fetch all packages
  const { installedPackages, isLoading: integrationIsLoading } = useFetchIntegrations();

  // From the ruleId (which should be a value for a signal.rule.id field) we find the rule
  // of the same id, which we then use its name to match a package's name.
  const integration: PackageListItem | undefined = useMemo(() => {
    const signalRuleId = Array.isArray(ruleId) ? ruleId[0] : ruleId;
    const rule = (data?.rules || []).find((r: RuleResponse) => r.id === signalRuleId);
    if (!rule) {
      return undefined;
    }

    return installedPackages.find((installedPackage) => installedPackage.name === rule.name);
  }, [data?.rules, installedPackages, ruleId]);

  return useMemo(
    () => ({
      integration,
      isLoading: ruleIsLoading || integrationIsLoading,
    }),
    [integration, integrationIsLoading, ruleIsLoading]
  );
};
