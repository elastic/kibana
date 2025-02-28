/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { RuleCustomizationEnum, type FilterOptions } from '../../../../rule_management/logic/types';

export type UpgradePrebuiltRulesTableFilterOptions = Pick<
  FilterOptions,
  'filter' | 'tags' | 'ruleSource'
>;

interface UseFilterPrebuiltRulesToUpgradeParams {
  data: RuleUpgradeState[];
  filterOptions: UpgradePrebuiltRulesTableFilterOptions;
}

export const useFilterPrebuiltRulesToUpgrade = ({
  data,
  filterOptions,
}: UseFilterPrebuiltRulesToUpgradeParams): RuleUpgradeState[] => {
  return useMemo(() => {
    const { filter, tags, ruleSource } = filterOptions;

    return data.filter((ruleInfo) => {
      if (filter && !ruleInfo.current_rule.name.toLowerCase().includes(filter.toLowerCase())) {
        return false;
      }

      if (tags?.length && !tags.every((tag) => ruleInfo.current_rule.tags.includes(tag))) {
        return false;
      }

      if (ruleSource?.length === 1 && ruleInfo.current_rule.rule_source.type === 'external') {
        if (ruleSource.includes(RuleCustomizationEnum.customized)) {
          return ruleInfo.current_rule.rule_source.is_customized;
        }
        return ruleInfo.current_rule.rule_source.is_customized === false;
      }

      return true;
    });
  }, [filterOptions, data]);
};
