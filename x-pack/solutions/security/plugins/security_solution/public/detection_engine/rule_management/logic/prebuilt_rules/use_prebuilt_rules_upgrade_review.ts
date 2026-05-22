/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@kbn/react-query';
import type { RuleCustomizationStatus } from '../../../../../common/api/detection_engine';
import type {
  ReviewRuleUpgradeResponseBody,
  ReviewRuleUpgradeSortItem,
} from '../../../../../common/api/detection_engine/prebuilt_rules';
import type { SearchRulesAggregations } from '../../../../../common/api/detection_engine/rule_management';
import type { GranularRulesSearch } from '../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import * as i18n from '../translations';
import { useFetchPrebuiltRulesUpgradeReviewQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_upgrade_review_query';
import { buildUpgradeReviewKqlFilter } from './build_upgrade_review_kql_filter';

interface UsePrebuiltRulesUpgradeReviewParams {
  page: number;
  perPage: number;
  filterOptions?: {
    tags?: string[];
    customizationStatus?: RuleCustomizationStatus;
    ruleIds?: string[];
  };
  searchTerm?: string;
  sortingOptions?: ReviewRuleUpgradeSortItem;
  aggregations?: SearchRulesAggregations;
  fields?: string[];
}

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @returns useQuery result
 */
export const usePrebuiltRulesUpgradeReview = (
  requestParameters: UsePrebuiltRulesUpgradeReviewParams,
  options?: UseQueryOptions<ReviewRuleUpgradeResponseBody>
) => {
  const { addError } = useAppToasts();

  const trimmedSearchTerm = requestParameters.searchTerm?.trim();
  const search: GranularRulesSearch | undefined = trimmedSearchTerm?.length
    ? { term: trimmedSearchTerm, mode: 'legacy' }
    : undefined;

  return useFetchPrebuiltRulesUpgradeReviewQuery(
    {
      page: requestParameters.page,
      per_page: requestParameters.perPage,
      filter: buildUpgradeReviewKqlFilter(requestParameters.filterOptions),
      search,
      sort: requestParameters.sortingOptions ? [requestParameters.sortingOptions] : undefined,
      aggregations: requestParameters.aggregations,
      fields: requestParameters.fields,
    },
    {
      onError: (error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
      ...options,
    }
  );
};
