/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import type {
  EuiSelectableOption,
  EuiSelectableOptionCheckedType,
} from '@elastic/eui/src/components/selectable/selectable_option';
import type { RulesQueryResponse } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { filterExistsInFiltersArray } from '../../utils/filter';
import { useKibana } from '../../../common/lib/kibana';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { FILTER_KEY } from '../../components/alert_summary/search_bar/sources_filter_button';

export const SOURCE_OPTION_TEST_ID = 'alert-summary-source-option-';

export interface UseSourcesParams {
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * All rules
   */
  ruleResponse: RulesQueryResponse | undefined;
}

/**
 * Combining installed packages and rules to create an interface that the SourceFilterButton can take as input (as EuiSelectableOption).
 * If there is not match between a package and the rules, the source is not returned.
 * If a filter exists (we assume that this filter is negated) we do not mark the source as checked for the EuiFilterButton.
 */
export const useSources = ({ packages, ruleResponse }: UseSourcesParams): EuiSelectableOption[] => {
  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  // There can be existing filters coming from the url
  const currentFilters = filterManager.getFilters();

  return useMemo(() => {
    const result: EuiSelectableOption[] = [];

    packages.forEach((p: PackageListItem) => {
      const matchingRule = (ruleResponse?.rules || []).find((r: RuleResponse) =>
        r.related_integrations.map((ri) => ri.package).includes(p.name)
      );

      if (matchingRule) {
        // Retrieves the filter from the key/value pair
        const currentFilterExists = filterExistsInFiltersArray(currentFilters, FILTER_KEY, p.title);

        // A EuiSelectableOption is checked only if there is no matching filter for that rule
        const source = {
          'data-test-subj': `${SOURCE_OPTION_TEST_ID}${p.title}`,
          ...(!currentFilterExists && { checked: 'on' as EuiSelectableOptionCheckedType }),
          key: matchingRule?.name,
          label: p.title,
        };
        result.push(source);
      }
    });

    return result;
  }, [currentFilters, packages, ruleResponse]);
};
