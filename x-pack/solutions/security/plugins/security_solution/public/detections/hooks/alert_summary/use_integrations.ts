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
import { filterExistsInFiltersArray } from '../../utils/filter';
import { useKibana } from '../../../common/lib/kibana';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { FILTER_KEY } from '../../components/alert_summary/search_bar/integrations_filter_button';

export const INTEGRATION_OPTION_TEST_ID = 'alert-summary-integration-option-';

export interface UseIntegrationsParams {
  /**
   * List of installed AI for SOC integrations
   */
  packages: PackageListItem[];
  /**
   * Result from the useQuery to fetch all rules
   */
  ruleResponse: {
    /**
     * Result from fetching all rules
     */
    rules: RuleResponse[];
    /**
     * True while rules are being fetched
     */
    isLoading: boolean;
  };
}

export interface UseIntegrationsResult {
  /**
   * List of integrations ready to be consumed by the IntegrationFilterButton component
   */
  integrations: EuiSelectableOption[];
  /**
   * True while rules are being fetched
   */
  isLoading: boolean;
}

/**
 * Combining installed packages and rules to create an interface that the IntegrationFilterButton can take as input (as EuiSelectableOption).
 * If there is no match between a package and the rules, the integration is not returned.
 * If a filter exists (we assume that this filter is negated) we do not mark the integration as checked for the EuiFilterButton.
 */
export const useIntegrations = ({
  packages,
  ruleResponse,
}: UseIntegrationsParams): UseIntegrationsResult => {
  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  // There can be existing rules filtered out, coming when parsing the url
  const currentFilters = filterManager.getFilters();

  const integrations = useMemo(() => {
    const result: EuiSelectableOption[] = [];

    packages.forEach((p: PackageListItem) => {
      const matchingRule = ruleResponse.rules.find((r: RuleResponse) => r.name === p.name);

      if (matchingRule) {
        // Retrieves the filter from the key/value pair
        const currentFilter = filterExistsInFiltersArray(
          currentFilters,
          FILTER_KEY,
          matchingRule.id
        );

        // A EuiSelectableOption is checked only if there is no matching filter for that rule
        const integration = {
          'data-test-subj': `${INTEGRATION_OPTION_TEST_ID}${p.title}`,
          ...(!currentFilter && { checked: 'on' as EuiSelectableOptionCheckedType }),
          key: matchingRule?.id, // we save the rule id that we will match again the signal.rule.id field on the alerts
          label: p.title,
        };
        result.push(integration);
      }
    });

    return result;
  }, [currentFilters, packages, ruleResponse.rules]);

  return useMemo(
    () => ({
      integrations,
      isLoading: ruleResponse.isLoading,
    }),
    [integrations, ruleResponse.isLoading]
  );
};
