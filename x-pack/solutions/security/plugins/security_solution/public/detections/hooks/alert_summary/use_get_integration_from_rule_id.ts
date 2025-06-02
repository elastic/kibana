/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type { RuleResponse } from '../../../../common/api/detection_engine';

const EMPTY_ARRAY: RuleResponse[] = [];

export interface UseGetIntegrationFromRuleIdParams {
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * Id of the rule. This should be the value from the signal.rule.id field
   */
  ruleId: string | string[];
  /**
   * Result from fetching all rules
   */
  rules: RuleResponse[] | undefined;
}

export interface UseGetIntegrationFromRuleIdResult {
  /**
   * List of integrations ready to be consumed by the IntegrationFilterButton component
   */
  integration: PackageListItem | undefined;
}

/**
 * Hook that returns a package (integration) from a ruleId (value for the signal.rule.id field), a list of rules and packages.
 * This hook is used in the GroupedAlertTable's accordion when grouping by signal.rule.id, to render the title as well as statistics.
 */
export const useGetIntegrationFromRuleId = ({
  packages,
  ruleId,
  rules = EMPTY_ARRAY,
}: UseGetIntegrationFromRuleIdParams): UseGetIntegrationFromRuleIdResult => {
  // From the ruleId (which should be a value for a signal.rule.id field) we find the rule
  // of the same id, which we then use its name to match a package's name.
  const integration: PackageListItem | undefined = useMemo(() => {
    const signalRuleId = Array.isArray(ruleId) ? ruleId[0] : ruleId;
    const rule = rules.find((r: RuleResponse) => r.id === signalRuleId);
    if (!rule) {
      return undefined;
    }

    return packages.find((p) => rule.related_integrations.map((ri) => ri.package).includes(p.name));
  }, [packages, rules, ruleId]);

  return useMemo(
    () => ({
      integration,
    }),
    [integration]
  );
};
