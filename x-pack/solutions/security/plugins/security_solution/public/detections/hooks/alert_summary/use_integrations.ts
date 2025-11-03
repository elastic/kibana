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
import { RELATED_INTEGRATION } from '../../constants';
import { filterExistsInFiltersArray } from '../../utils/filter';
import { useKibana } from '../../../common/lib/kibana';

export const INTEGRATION_OPTION_TEST_ID = 'alert-summary-integration-option-';

export interface UseIntegrationsParams {
  /**
   * List of installed EASE integrations
   */
  packages: PackageListItem[];
}

export interface UseIntegrationsResult {
  /**
   * List of integrations ready to be consumed by the IntegrationFilterButton component
   */
  integrations: EuiSelectableOption[];
}

/**
 * Creates an interface that the IntegrationFilterButton can take as input (as EuiSelectableOption).
 * If a filter exists (we assume that this filter is negated) we do not mark the integration as checked for the EuiFilterButton.
 */
export const useIntegrations = ({ packages }: UseIntegrationsParams): UseIntegrationsResult => {
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
      // Retrieves the filter from the key/value pair
      const currentFilter = filterExistsInFiltersArray(currentFilters, RELATED_INTEGRATION, p.name);

      // A EuiSelectableOption is checked only if there is no matching filter for that rule
      const integration = {
        'data-test-subj': `${INTEGRATION_OPTION_TEST_ID}${p.title}`,
        ...(!currentFilter && { checked: 'on' as EuiSelectableOptionCheckedType }),
        key: p.name,
        label: p.title,
      };
      result.push(integration);
    });

    return result;
  }, [currentFilters, packages]);

  return useMemo(
    () => ({
      integrations,
    }),
    [integrations]
  );
};
