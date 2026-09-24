/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import type { ReviewRuleInstallationResponseBody } from '../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  PrebuiltRuleAssetsAggregations,
  PrebuiltRuleAssetsSortItem,
} from '../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';
import type {
  GranularRulesFilter,
  GranularRulesSearch,
} from '../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import { prepareKQLStringParam } from '../../../../../common/utils/kql';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { useFetchPrebuiltRulesInstallReviewQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_install_review_query';
import type { AddPrebuiltRulesTableFilterOptions } from '../../../rule_management_ui/components/rules_table/add_prebuilt_rules_table/add_prebuilt_rules_table_context';

interface UsePrebuiltRulesInstallReviewParams {
  page: number;
  perPage: number;
  filterOptions?: AddPrebuiltRulesTableFilterOptions;

  sortingOptions?: PrebuiltRuleAssetsSortItem;
  aggregations?: PrebuiltRuleAssetsAggregations;
  fields?: string[];
}

const ASSET_TAGS_FIELD = 'security-rule.tags';

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

  const trimmedSearchTerm = requestParameters.filterOptions?.name?.trim();
  const search: GranularRulesSearch | undefined = trimmedSearchTerm?.length
    ? { term: trimmedSearchTerm, mode: 'legacy' }
    : undefined;

  return useFetchPrebuiltRulesInstallReviewQuery(
    {
      page: requestParameters.page,
      per_page: requestParameters.perPage,
      filter: buildInstallReviewKqlFilter(requestParameters.filterOptions),
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

const buildTagsClause = (tags: string[]): string => {
  const nonEmptyTags = tags.filter((tag) => tag.length > 0);
  if (nonEmptyTags.length === 0) {
    return '';
  }
  return `${ASSET_TAGS_FIELD}:(${nonEmptyTags.map(prepareKQLStringParam).join(' AND ')})`;
};

/**
 * Converts filter options from a simplified UI format to a format expected by the API.
 */
export const buildInstallReviewKqlFilter = (
  filterOptions: AddPrebuiltRulesTableFilterOptions | undefined
): GranularRulesFilter | undefined => {
  if (!filterOptions) {
    return undefined;
  }

  const parts: string[] = [];

  if (filterOptions.tags.length) {
    const clause = buildTagsClause(filterOptions.tags);
    if (clause) {
      parts.push(clause);
    }
  }

  if (parts.length === 0) {
    return undefined;
  }

  return { term: parts.map((part) => `(${part})`).join(' AND '), mode: 'KQL' };
};
