/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertRulesFilterToKQL } from '../../../../../../../common/detection_engine/rule_management/rule_filtering';
import type { QueryOrIds } from '../../../../../rule_management/logic';
import type { DryRunResult } from '../types';
import type { FilterOptions } from '../../../../../rule_management/logic/types';

import { BulkActionsDryRunErrCodeEnum } from '../../../../../../../common/api/detection_engine';

type PrepareSearchFilterProps =
  | { selectedRuleIds: string[]; dryRunResult?: DryRunResult }
  | { filterOptions: FilterOptions; dryRunResult?: DryRunResult };

/**
 * helper methods to prepare search params for bulk actions based on results of previous dry run
 * It excludes failed rules from search and perform bulk action on possible successfully edited rules
 * @param dryRunResult {@link DryRunResult} result of API _bulk_action dry_run
 * @param {string[]} selectedRuleIds - list of selected rule ids
 * @param filterOptions {@link FilterOptions} find filter
 * @returns either list of ids or KQL search query
 */
export const prepareSearchParams = ({
  dryRunResult,
  ...props
}: PrepareSearchFilterProps): QueryOrIds => {
  // if selectedRuleIds present, filter out rules that failed during dry run
  if ('selectedRuleIds' in props) {
    const failedRuleIdsSet = new Set(dryRunResult?.ruleErrors.flatMap(({ ruleIds }) => ruleIds));

    return { ids: props.selectedRuleIds.filter((id) => !failedRuleIdsSet.has(id)) };
  }

  // otherwise create filter that excludes failed results based on dry run errors
  let modifiedFilterOptions = { ...props.filterOptions };
  dryRunResult?.ruleErrors.forEach(({ errorCode }) => {
    switch (errorCode) {
      case BulkActionsDryRunErrCodeEnum.IMMUTABLE:
      case BulkActionsDryRunErrCodeEnum.PREBUILT_CUSTOMIZATION_LICENSE:
        modifiedFilterOptions = { ...modifiedFilterOptions, showCustomRules: true };
        break;
      case BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_INDEX_PATTERN:
      case BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_AUTH:
        modifiedFilterOptions = {
          ...modifiedFilterOptions,
          excludeRuleTypes: [...(modifiedFilterOptions.excludeRuleTypes ?? []), 'machine_learning'],
        };
        break;
      case BulkActionsDryRunErrCodeEnum.ESQL_INDEX_PATTERN:
        modifiedFilterOptions = {
          ...modifiedFilterOptions,
          excludeRuleTypes: [...(modifiedFilterOptions.excludeRuleTypes ?? []), 'esql'],
        };
        break;
    }
  });

  return {
    query: convertRulesFilterToKQL(modifiedFilterOptions),
  };
};
