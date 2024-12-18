/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { FilterOptions } from '../../../../rule_management/logic/types';

export type AddPrebuiltRulesTableFilterOptions = Pick<FilterOptions, 'filter' | 'tags'>;

export const useFilterPrebuiltRulesToInstall = ({
  rules,
  filterOptions,
}: {
  rules: RuleResponse[];
  filterOptions: AddPrebuiltRulesTableFilterOptions;
}) => {
  const filteredRules = useMemo(() => {
    const { filter, tags } = filterOptions;
    return rules.filter((rule) => {
      if (filter && !rule.name.toLowerCase().includes(filter.toLowerCase())) {
        return false;
      }

      if (tags && tags.length > 0) {
        return tags.every((tag) => rule.tags.includes(tag));
      }

      return true;
    });
  }, [filterOptions, rules]);

  return filteredRules;
};
