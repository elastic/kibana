/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import type { ReviewRuleInstallationResponseBody } from '../../../../../common/api/detection_engine/prebuilt_rules';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { useFetchPrebuiltRulesInstallReviewQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_install_review_query';
import type { AddPrebuiltRulesTableFilterOptions } from '../../../rule_management_ui/components/rules_table/add_prebuilt_rules_table/add_prebuilt_rules_table_context';
import type { PrebuiltRuleAssetsSortItem } from '../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';
import type { PrebuiltRuleAssetsFilter } from '../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_filter';

interface UsePrebuiltRulesInstallReviewParams {
  page: number;
  perPage: number;
  filterOptions?: AddPrebuiltRulesTableFilterOptions;
  sortingOptions?: PrebuiltRuleAssetsSortItem;
}

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @returns useQuery result
 */
export const usePrebuiltRulesInstallReview = (
  requestParameters: UsePrebuiltRulesInstallReviewParams,
  options?: UseQueryOptions<ReviewRuleInstallationResponseBody>
) => {
  const { addError } = useAppToasts();

  return useFetchPrebuiltRulesInstallReviewQuery(
    {
      page: requestParameters.page,
      per_page: requestParameters.perPage,
      filter: prepareFilters(requestParameters.filterOptions),
      sort: requestParameters.sortingOptions ? [requestParameters.sortingOptions] : undefined,
    },
    {
      onError: (error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
      ...options,
    }
  );
};

/**
 * Converts filter options from a simplified UI format to a format expected by the API.
 */
function prepareFilters(
  filterOptions: AddPrebuiltRulesTableFilterOptions | undefined
): PrebuiltRuleAssetsFilter | undefined {
  if (!filterOptions) {
    return undefined;
  }

  const filter: PrebuiltRuleAssetsFilter = {
    fields: {},
  };

  if (filterOptions.name) {
    filter.fields.name = {
      include: { values: [filterOptions.name] },
    };
  }

  if (filterOptions.tags.length) {
    filter.fields.tags = {
      include: { values: filterOptions.tags },
    };
  }

  const isEmptyFilter = Object.keys(filter.fields).length === 0;

  return isEmptyFilter ? undefined : filter;
}
