/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import type { IRuleExecutionLogForExecutors } from '../../../../rule_monitoring';
import { toEndStageQuerySuffix } from './build_end_stage_clause';
import { findFullTextBlocker } from './find_full_text_blocker';
import { fetchOutputColumns, fetchSourceFieldTypes } from './get_exception_schemas';
import {
  getFieldsToInspect,
  needsOutputColumns,
  splitExceptionItems,
} from './split_exception_items';
import type { EndStageItem, SkippedItem } from './types';

const MAX_ITEMS_IN_MESSAGE = 5;

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
  /** Warnings for the rule execution result. */
  warnings: string[];
}

const describe = ({ item, reason }: SkippedItem): string =>
  `"${item.name}" (${item.item_id}): ${reason}`;

const toWarning = (skipped: SkippedItem[]): string => {
  const shown = skipped.slice(0, MAX_ITEMS_IN_MESSAGE).map(describe).join('; ');
  const more = skipped.length - MAX_ITEMS_IN_MESSAGE;
  return `${skipped.length} exception item(s) could not be applied to this rule: ${shown}${
    more > 0 ? `; and ${more} more` : ''
  }`;
};

/**
 * A full-text comparison of a `text` column is accepted by Elasticsearch only at some positions of a query, and an
 * error would fail the whole rule, so the items that use it are applied only when no command of the query can
 * make the position unsafe. The check reads the query, so it needs no request.
 */
const dropBlockedFullTextItems = ({
  query,
  endStageItems,
}: {
  query: string;
  endStageItems: EndStageItem[];
}): { applied: EndStageItem[]; blocked: SkippedItem[] } => {
  const blocker = endStageItems.some(({ fullText }) => fullText)
    ? findFullTextBlocker(query)
    : undefined;
  if (blocker == null) {
    return { applied: endStageItems, blocked: [] };
  }
  return {
    applied: endStageItems.filter(({ fullText }) => !fullText),
    blocked: endStageItems
      .filter(({ fullText }) => fullText)
      .map(({ item }) => ({
        item,
        level: 'warn',
        reason: `a text column is compared with a full-text function, which Elasticsearch accepts only at some positions of a query, and this query uses "${blocker}"`,
      })),
  };
};

/**
 * Applies the exception items that reference columns computed by the rule query at the end of the query, and
 * leaves the others in the DSL filter. Any failure to inspect the schemas leaves every item in the DSL filter,
 * which is how exceptions work without this feature.
 */
export const applyEndStageExceptions = async ({
  esClient,
  ruleExecutionLogger,
  query,
  indices,
  items,
  exceptionFilter,
  unprocessedExceptions,
  buildDslFilter,
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
}): Promise<EndStageExceptionsResult> => {
  const unchanged = { query, exceptionFilter, unprocessedExceptions, warnings: [] };
  if (items.length === 0 || indices.length === 0) {
    return unchanged;
  }

  try {
    const sourceFieldTypes = await fetchSourceFieldTypes({
      esClient,
      indices,
      fields: getFieldsToInspect(items),
    });
    if (!needsOutputColumns(items, sourceFieldTypes)) {
      return unchanged;
    }

    const outputColumns = await fetchOutputColumns({ esClient, query });
    const split = splitExceptionItems({ items, sourceFieldTypes, outputColumns });
    const { dslItems } = split;
    const { applied: endStageItems, blocked } = dropBlockedFullTextItems({
      query,
      endStageItems: split.endStageItems,
    });
    const skippedItems = [...split.skippedItems, ...blocked];

    const debugSkipped = skippedItems.filter(({ level }) => level === 'debug');
    const warnSkipped = skippedItems.filter(({ level }) => level === 'warn');
    if (debugSkipped.length > 0) {
      ruleExecutionLogger.debug(
        `${debugSkipped.length} exception item(s) do not apply to this rule: ${debugSkipped
          .map(describe)
          .join('; ')}`
      );
    }
    const warning = warnSkipped.length > 0 ? toWarning(warnSkipped) : undefined;
    if (warning != null) {
      ruleExecutionLogger.warn(warning);
    }
    if (endStageItems.length > 0) {
      ruleExecutionLogger.debug(
        `${
          endStageItems.length
        } exception item(s) are applied at the end of the ES|QL query: ${endStageItems
          .map(({ item }) => item.item_id)
          .join(', ')}`
      );
    }

    const warnings = warning != null ? [warning] : [];
    if (endStageItems.length === 0 && skippedItems.length === 0) {
      return unchanged;
    }

    const dsl =
      dslItems.length > 0
        ? await buildDslFilter(dslItems)
        : { filter: undefined, unprocessedExceptions: [] };
    return {
      query: `${query}${toEndStageQuerySuffix(endStageItems.map(({ clause }) => clause))}`,
      exceptionFilter: dsl.filter,
      unprocessedExceptions: dsl.unprocessedExceptions,
      warnings,
    };
  } catch (error) {
    const message = `Could not inspect the fields of the exceptions, so all exceptions use the DSL filter: ${error?.message}`;
    ruleExecutionLogger.warn(message);
    return { ...unchanged, warnings: [message] };
  }
};
