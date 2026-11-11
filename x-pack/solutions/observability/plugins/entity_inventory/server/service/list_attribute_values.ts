/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RegisteredEntityDefinition } from '@kbn/entity-store/server';
import { InventoryRequestError } from '../inventory/errors/inventory_request_error';
import { executeEsql, planRowLimit, toSourceError } from '../inventory/executor';
import type { EsqlQueryResult, SourceError } from '../inventory/executor';
import { ATTRIBUTE_VALUE_COLUMN, generateAttributeValuesQueries } from '../inventory/generator';
import type { GeneratedQuery, QueryPlan } from '../inventory/generator';
import type { ListAttributeValuesRequest } from '../inventory/types';
import type { AttributeValuesResponse } from '../routes/types';
import { probeAndPlanSources, toTypeDefinitionError } from './planning';

/** What listing the values of an attribute reads from the plugin. */
export interface AttributeValuesDependencies {
  /** Returns the definition of a type with a `dynamic` block, or throws `InventoryTypeNotFoundError`. */
  getDynamicDefinition: (type: string) => Promise<RegisteredEntityDefinition>;
  esClient: ElasticsearchClient;
  logger: Logger;
}

/** What the values queries of one type are generated from. */
interface AttributeValuesPlan {
  type: string;
  /** The plans that can contribute and whose probe did not fail, with their queries in step. */
  plans: QueryPlan[];
  queries: GeneratedQuery[];
  /** One entry per source whose probe failed. */
  probeErrors: SourceError[];
}

// The `errors[]` reason for a values query whose response has `is_partial: true`.
const PARTIAL_VALUES_REASON =
  'partial result: some shards or clusters did not answer, so values may be missing';

const uniqueErrors = (errors: SourceError[]): SourceError[] => [
  ...new Map(errors.map((error) => [JSON.stringify(error), error])).values(),
];

/**
 * Plans the values queries of every type in scope that suggests the attribute as a filter.
 * Throws `InventoryTypeNotFoundError` for a type that is not registered, and
 * `InventoryRequestError` when no type in scope suggests the attribute. A type that does not
 * suggest it is left out. A source whose probe failed runs no query and is reported in the
 * type's `probeErrors`.
 */
const planAttributeValues = async (
  { getDynamicDefinition, esClient, logger }: AttributeValuesDependencies,
  { attribute, types, selections, window, limit, signal }: ListAttributeValuesRequest
): Promise<AttributeValuesPlan[]> => {
  const definitions = await Promise.all(
    [...new Set(types)].map((type) => getDynamicDefinition(type))
  );
  const suggesting = definitions.filter(({ dynamic }) =>
    dynamic?.suggestedFilters?.includes(attribute)
  );
  if (suggesting.length === 0) {
    throw new InventoryRequestError(
      `"${attribute}" is not a suggested filter of any of the types in scope`
    );
  }

  return Promise.all(
    suggesting.map(async (definition): Promise<AttributeValuesPlan> => {
      try {
        const { allPlans, probeErrors, failedPatterns } = await probeAndPlanSources(
          esClient,
          definition,
          signal
        );
        const allQueries = generateAttributeValuesQueries(definition, allPlans, {
          attribute,
          selections,
          window,
          limit,
        });
        const runnable = allPlans.flatMap((plan, position) => {
          const query = allQueries[position];
          return query === undefined || failedPatterns.has(plan.indexPattern)
            ? []
            : [{ plan, query }];
        });
        return {
          type: definition.type,
          plans: runnable.map(({ plan }) => plan),
          queries: runnable.map(({ query }) => query),
          probeErrors,
        };
      } catch (error) {
        throw toTypeDefinitionError(logger, definition, error);
      }
    })
  );
};

/**
 * Lists the values a dropdown can offer for `attribute` over the types in scope: one query per
 * plan that can contribute, run concurrently, each plan's value labels applied, merged into
 * sorted distinct values. Throws what `planAttributeValues` throws. A source whose probe or query
 * failed, or whose answer is partial, is reported in `errors[]` and does not fail the request.
 * `truncated` is true only when the limit left values out; then a selected value beyond the cut
 * may come back in `invalidSelections`.
 */
export const listAttributeValues = async (
  dependencies: AttributeValuesDependencies,
  request: ListAttributeValuesRequest
): Promise<AttributeValuesResponse> => {
  const { attribute, selected, limit, signal } = request;
  const typePlans = await planAttributeValues(dependencies, {
    ...request,
    limit: planRowLimit(limit),
  });

  // Types that share a source and a filter send the same query, so it runs once.
  const runs = new Map<string, Promise<EsqlQueryResult>>();
  const run = (query: GeneratedQuery): Promise<EsqlQueryResult> => {
    const key = JSON.stringify([query.esql, query.params]);
    const existing = runs.get(key);
    if (existing) {
      return existing;
    }
    const started = executeEsql(dependencies.esClient, query, { signal });
    runs.set(key, started);
    return started;
  };

  const runnable = typePlans.flatMap(({ plans, queries }) =>
    plans.map((plan, position) => ({ plan, query: queries[position] }))
  );
  // Settled, not raced: one failing source must not hide the values of the others.
  const outcomes = await Promise.allSettled(runnable.map(({ query }) => run(query)));

  const errors: SourceError[] = typePlans.flatMap(({ probeErrors }) => probeErrors);
  const labelled = new Set<string>();
  outcomes.forEach((outcome, position) => {
    const { plan } = runnable[position];
    if (outcome.status === 'rejected') {
      errors.push(toSourceError(plan.indexPattern, outcome.reason));
      return;
    }
    if (outcome.value.isPartial) {
      errors.push({
        indexPattern: plan.indexPattern,
        status: null,
        reason: PARTIAL_VALUES_REASON,
      });
    }
    const labels = plan.attributes.find(({ name }) => name === attribute)?.valueLabels;
    outcome.value.rows.forEach((row) => {
      const raw = row[ATTRIBUTE_VALUE_COLUMN];
      if (raw === null || raw === undefined || Array.isArray(raw)) {
        return;
      }
      const text = String(raw);
      labelled.add(labels !== undefined && Object.hasOwn(labels, text) ? labels[text] : text);
    });
  });

  const values = [...labelled].sort();
  return {
    values: values.slice(0, limit),
    invalidSelections: selected.filter((value) => !labelled.has(value)),
    truncated: values.length > limit,
    errors: uniqueErrors(errors),
  };
};
