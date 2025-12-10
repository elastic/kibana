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
import type { ReviewPrebuiltRuleInstallationSort } from '../../../../../common/api/detection_engine/prebuilt_rules/common/review_prebuilt_rules_installation_sort';
import type { AddPrebuiltRulesTableFilterOptions } from '../../../rule_management_ui/components/rules_table/add_prebuilt_rules_table/add_prebuilt_rules_table_context';

interface UsePrebuiltRulesInstallReviewParams {
  page: number;
  perPage: number;
  filterOptions: AddPrebuiltRulesTableFilterOptions;
  sortingOptions: ReviewPrebuiltRuleInstallationSort;
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
      filter: {
        fields: {
          name: {
            include: [requestParameters.filterOptions.name],
          },
          tags: {
            include: requestParameters.filterOptions.tags,
          },
        },
      },
      sort: requestParameters.sortingOptions,
    },
    {
      // TODO: Add better error message
      onError: (error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
      ...options,
    }
  );
};
