/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { IRuleExecutionLogForExecutors } from '../../../../rule_monitoring';
import { toEndStageQuerySuffix } from './build_end_stage_clause';
import { ColumnTypeMismatchError } from './column_type_mismatch_error';
import { EndStageLimitExceededError } from './end_stage_limit_exceeded_error';
import { buildExceptionsLogEntry } from './build_exceptions_log_entry';
import { buildExcludeEveryRowWarning } from './exclude_every_row_warning';
import { ExceptionsInspectionFailedError } from './exceptions_inspection_failed_error';
import { InvalidExceptionValuesError } from './invalid_exception_values_error';
import { resolveEndStageItems } from './resolve_end_stage_items';
import { INVALID_ITEM_CODES } from './types';
import { fetchOutputColumns } from './get_exception_schemas';

export interface EndStageExceptionsResult {
  /** The query to run, with the stage of the exceptions at the end. */
  query: string;
  /** Warnings for the rule: the rule runs, and these tell the user about exceptions that it should check. */
  warnings: string[];
}

/** Runs the request and, when it fails, throws `ExceptionsInspectionFailedError` with the reason of the failure. */
const withInspectionError = async <T>(request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    throw new ExceptionsInspectionFailedError(error?.message);
  }
};

/**
 * Applies the exception items on the output columns of the query by appending one `WHERE` stage to the query, and returns the
 * query to run. The type of each column comes from the item, and the output columns of the query are read to find the columns
 * that the query does not output (the item is skipped) and the columns that it outputs with another type (the rule fails).
 */
export const applyEndStageExceptions = async ({
  esClient,
  ruleExecutionLogger,
  query,
  items,
  probeFilter,
}: {
  esClient: ElasticsearchClient;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  /** The query as the rule runs it, without the final limit. */
  query: string;
  /** The items that apply to the output columns, without the expired ones. */
  items: readonly ExceptionListItemSchema[];
  /** The `filter` of the request that the rule sends, which the request for the output columns carries too. */
  probeFilter?: estypes.QueryDslQueryContainer;
}): Promise<EndStageExceptionsResult> => {
  if (items.length === 0) {
    return { query, warnings: [] };
  }

  const outputColumns = await withInspectionError(() =>
    fetchOutputColumns({ esClient, query, filter: probeFilter })
  );
  const { endStageItems, skippedItems, typeMismatches } = resolveEndStageItems({
    items,
    outputColumns,
  });
  const invalidItems = skippedItems.filter(({ code }) => INVALID_ITEM_CODES.has(code));
  if (invalidItems.length > 0) {
    throw new InvalidExceptionValuesError(invalidItems);
  }
  if (typeMismatches.length > 0) {
    throw new ColumnTypeMismatchError(typeMismatches);
  }
  const endStages = toEndStageQuerySuffix(endStageItems, query.length);
  if ('limit' in endStages) {
    throw new EndStageLimitExceededError(endStages.limit);
  }

  const finalQuery = `${query}${endStages.suffix}`;
  ruleExecutionLogger.info(
    JSON.stringify(buildExceptionsLogEntry({ query: finalQuery, endStageItems, skippedItems }))
  );
  const warning = buildExcludeEveryRowWarning(endStageItems);
  return { query: finalQuery, warnings: warning === undefined ? [] : [warning] };
};
