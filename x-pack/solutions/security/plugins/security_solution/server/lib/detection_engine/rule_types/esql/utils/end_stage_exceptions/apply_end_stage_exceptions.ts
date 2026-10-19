/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { IRuleExecutionLogForExecutors } from '../../../../rule_monitoring';
import { toEndStageQuerySuffix } from './build_end_stage_clause';
import { EndStageLimitExceededError } from './end_stage_limit_exceeded_error';
import { buildExceptionsLogEntry } from './build_exceptions_log_entry';
import { ExceptionsInspectionFailedError } from './exceptions_inspection_failed_error';
import { InvalidExceptionValuesError } from './invalid_exception_values_error';
import { SkipReasonCode } from './types';
import { fetchOutputColumns, fetchSourceFieldTypes } from './get_exception_schemas';
import {
  getFieldsToInspect,
  needsOutputColumns,
  splitExceptionItems,
} from './split_exception_items';

export interface ExceptionsFilterResult {
  filter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
}

export interface EndStageExceptionsResult {
  /** The query to run, with the end-stage exceptions appended. */
  query: string;
  /** The DSL filter, built only from the items that stay in the DSL. */
  exceptionFilter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
}

/** Runs the request and, when it fails, throws `ExceptionsInspectionFailedError` with the reason of the failure. */
const withInspectionError = async <T>(request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    throw new ExceptionsInspectionFailedError(error?.message);
  }
};

/** Applies the exception items on columns that the rule query computes at the end of the query, leaves the others in the DSL filter, and logs what was not applied. */
export const applyEndStageExceptions = async ({
  esClient,
  ruleExecutionLogger,
  query,
  indices,
  items,
  exceptionFilter,
  unprocessedExceptions,
  buildDslFilter,
  probeFilter,
  fieldCapsFilter,
}: {
  esClient: ElasticsearchClient;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  /** The query as the rule runs it, without the final limit. */
  query: string;
  /** The index patterns of the query's `FROM`. */
  indices: string[];
  items: readonly ExceptionListItemSchema[];
  exceptionFilter: Filter | undefined;
  unprocessedExceptions: ExceptionListItemSchema[];
  buildDslFilter: (dslItems: ExceptionListItemSchema[]) => Promise<ExceptionsFilterResult>;
  /** The `filter` of the request that the rule sends, which the request for the output columns carries too. */
  probeFilter?: estypes.QueryDslQueryContainer;
  /** The filter of the real request without the exceptions, so that `_field_caps` reads the indices that the query reads. */
  fieldCapsFilter?: estypes.QueryDslQueryContainer;
}): Promise<EndStageExceptionsResult> => {
  const unchanged = { query, exceptionFilter, unprocessedExceptions };
  if (items.length === 0 || indices.length === 0) {
    return unchanged;
  }

  const { sourceFieldTypes, hasIndices } = await withInspectionError(() =>
    fetchSourceFieldTypes({
      esClient,
      indices,
      fields: getFieldsToInspect(items),
      indexFilter: fieldCapsFilter,
    })
  );

  // No index has documents in the time range, so the rule has nothing to exclude: it runs as it does without the feature
  if (!hasIndices || !needsOutputColumns(items, sourceFieldTypes)) {
    return unchanged;
  }

  const outputColumns = await withInspectionError(() =>
    fetchOutputColumns({ esClient, query, filter: probeFilter })
  );
  const split = splitExceptionItems({ items, sourceFieldTypes, outputColumns });
  const invalidItems = split.skippedItems.filter(
    ({ code }) => code === SkipReasonCode.ValueNotSupported
  );
  if (invalidItems.length > 0) {
    throw new InvalidExceptionValuesError(invalidItems);
  }
  const { dslItems, endStageItems, skippedItems } = split;
  const endStages = toEndStageQuerySuffix(endStageItems, query.length);
  if ('limit' in endStages) {
    throw new EndStageLimitExceededError(endStages.limit);
  }

  if (endStageItems.length === 0 && skippedItems.length === 0) {
    return unchanged;
  }

  const finalQuery = `${query}${endStages.suffix}`;
  ruleExecutionLogger.info(
    JSON.stringify(
      buildExceptionsLogEntry({
        query: finalQuery,
        dslItemCount: dslItems.length,
        endStageItems,
        skippedItems,
      })
    )
  );

  const dsl =
    dslItems.length > 0
      ? await buildDslFilter(dslItems)
      : { filter: undefined, unprocessedExceptions: [] };
  return {
    query: finalQuery,
    exceptionFilter: dsl.filter,
    unprocessedExceptions: dsl.unprocessedExceptions,
  };
};
