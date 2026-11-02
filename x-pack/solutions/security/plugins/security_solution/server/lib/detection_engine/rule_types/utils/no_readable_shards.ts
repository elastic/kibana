/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { CpsData } from '@kbn/alerting-plugin/server';
import type { SearchAfterAndBulkCreateReturnType } from '../types';
import { checkErrorDetails } from './check_error_details';

export type CpsLinkedProject = NonNullable<CpsData['linkedProjects']>[number];

interface ShardsSearchResult {
  _shards: Pick<estypes.ShardStatistics, 'total'>;
}

interface NoReadableShardsWarningParams {
  inputIndex: string[];
  cpsLinkedProjects?: CpsLinkedProject[];
}

interface ReportMissingAggregationsParams extends NoReadableShardsWarningParams {
  searchResult: ShardsSearchResult;
  searchErrors: string[];
  searchWarnings: string[];
  result: Pick<SearchAfterAndBulkCreateReturnType, 'success' | 'userError' | 'warningMessages'>;
  unexpectedErrorMessage: string;
}

/**
 * Returns true when the search request resolved to no shards at all, which happens when every
 * matched index is excluded from the search, e.g. the rule owner lacks the `read` privilege.
 */
export const hasZeroShards = (searchResult: ShardsSearchResult): boolean =>
  searchResult._shards.total === 0;

/**
 * Builds the warning shown when the rule matched indices during validation but the events search
 * resolved to zero shards. Field capabilities require only `view_index_metadata` while search
 * requires `read`, so this combination means the indices are visible but not readable.
 */
export const getNoReadableShardsWarning = ({
  inputIndex,
  cpsLinkedProjects,
}: NoReadableShardsWarningParams): string => {
  const indexPatterns = inputIndex.map((pattern) => `"${pattern}"`).join(', ');
  const base = `The events search returned no shards for index pattern(s) ${indexPatterns}, so no alerts can be created. Matching indices were found while validating the rule, which means the rule owner can see the index metadata but has no "read" index privilege on the indices.`;

  if (cpsLinkedProjects && cpsLinkedProjects.length > 0) {
    const projects = cpsLinkedProjects.map((project) => `"${project.alias}"`).join(', ');

    return `${base} Cross-project search silently excludes indices the rule owner cannot read in the linked projects (${projects}). Grant the rule owner the "read" index privilege on these index patterns in the linked projects, or re-save the rule as a user who has it.`;
  }

  return `${base} Grant the rule owner the "read" index privilege on these index patterns, or re-save the rule as a user who has it.`;
};

/**
 * Handles a search response without an `aggregations` object. Shard failures fail the run, a
 * zero-shard response is reported as a warning, per-cluster warnings (already pushed by the caller)
 * explain the missing aggregations on their own, and anything else is treated as an unexpected
 * condition and thrown.
 */
export const reportMissingAggregations = ({
  searchResult,
  searchErrors,
  searchWarnings,
  result,
  inputIndex,
  cpsLinkedProjects,
  unexpectedErrorMessage,
}: ReportMissingAggregationsParams): void => {
  if (searchErrors.length > 0) {
    result.success = false;
    result.userError = searchErrors.every((error) => checkErrorDetails(error).isUserError);

    return;
  }

  if (hasZeroShards(searchResult)) {
    const warning = getNoReadableShardsWarning({ inputIndex, cpsLinkedProjects });

    if (!result.warningMessages.includes(warning)) {
      result.warningMessages.push(warning);
    }

    return;
  }

  if (searchWarnings.length > 0) {
    return;
  }

  throw new Error(unexpectedErrorMessage);
};
