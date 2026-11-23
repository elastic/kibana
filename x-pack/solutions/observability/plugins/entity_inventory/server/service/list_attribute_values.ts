/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RegisteredEntityDefinition } from '@kbn/entity-store/server';
import { InventoryRequestError } from '../inventory/errors/inventory_request_error';
import { InventoryTypeDefinitionError } from '../inventory/errors/inventory_type_definition_error';
import { executeEsql, planRowLimit, probeSources, toSourceError } from '../inventory/executor';
import type { EsqlQueryResult } from '../inventory/executor';
import {
  ATTRIBUTE_VALUE_COLUMN,
  generateAttributeValuesQueries,
  getDynamicBlock,
  LAST_SEEN_COLUMN,
  planSources,
  resolveIdentityPlan,
} from '../inventory/generator';
import type { GeneratedQuery, QueryPlan } from '../inventory/generator';
import { noReadableIndexReason, partialValuesReason } from '../inventory/reasons';
import type { ListAttributeValuesRequest } from '../inventory/types';
import type { AttributeValuesResponse, SourceError } from '../../common';

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
        const { sources } = getDynamicBlock(definition);
        // Only a source that declares the attribute can give values, so no other source is probed.
        const identityFields = new Set(resolveIdentityPlan(definition).groupingFields);
        const probes = await probeSources(
          esClient,
          sources
            .filter(
              ({ attributes = [] }) =>
                identityFields.has(attribute) || attributes.some(({ name }) => name === attribute)
            )
            .map(({ indexPattern }) => indexPattern),
          { signal }
        );
        const probeErrors: SourceError[] = [];
        probes.forEach((probe, indexPattern) => {
          if (probe.failed) {
            probeErrors.push({ indexPattern, status: probe.status, reason: probe.reason });
          }
        });
        const failedPatterns = new Set(probeErrors.map(({ indexPattern }) => indexPattern));

        const allPlans = planSources(
          definition,
          sources.map(({ indexPattern }) => {
            const probe = probes.get(indexPattern);
            return { hasTimeSeries: probe !== undefined && !probe.failed && probe.hasTimeSeries };
          })
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
        if (error.name !== 'InventoryDefinitionError') {
          throw error;
        }
        const definitionError = new InventoryTypeDefinitionError(definition.type, error.message);
        logger.error(definitionError.message);
        throw definitionError;
      }
    })
  );
};

/**
 * Lists the values a dropdown can offer for `attribute` over the types in scope: one query per
 * plan that can contribute, run concurrently, the value labels applied by the query itself, merged
 * into sorted distinct values. Throws what `planAttributeValues` throws. A source whose probe or query
 * failed, or whose answer is partial, is reported in `errors[]` and does not fail the request.
 * `truncated` is true only when the limit left values out. Every selected value is in `values` or
 * in `invalidSelections`, so a selected value beyond the cut comes back in `invalidSelections`.
 */
export const listAttributeValues = async (
  dependencies: AttributeValuesDependencies,
  request: ListAttributeValuesRequest
): Promise<AttributeValuesResponse> => {
  const { selected, limit, signal } = request;
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
  const offered = new Set<string>();
  outcomes.forEach((outcome, position) => {
    const { plan } = runnable[position];
    if (outcome.status === 'rejected') {
      errors.push(toSourceError(plan.indexPattern, outcome.reason));
      return;
    }
    // `last_seen` is `MAX(@timestamp)`: typed `null` when no readable index behind the pattern maps
    // it, which is the only signal for a pattern that matches nothing the user may read.
    const lastSeen = outcome.value.columns.find(({ name }) => name === LAST_SEEN_COLUMN);
    if (lastSeen === undefined || lastSeen.type === 'null') {
      errors.push({
        indexPattern: plan.indexPattern,
        status: null,
        reason: noReadableIndexReason(plan.indexPattern),
      });
      return;
    }
    if (outcome.value.isPartial) {
      errors.push({
        indexPattern: plan.indexPattern,
        status: null,
        reason: partialValuesReason(),
      });
    }
    outcome.value.rows.forEach((row) => {
      const value = row[ATTRIBUTE_VALUE_COLUMN];
      if (value === null || value === undefined || Array.isArray(value)) {
        return;
      }
      offered.add(String(value));
    });
  });

  const sorted = [...offered].sort();
  const values = sorted.slice(0, limit);
  const returned = new Set(values);
  return {
    values,
    invalidSelections: selected.filter((value) => !returned.has(value)),
    truncated: sorted.length > limit,
    errors: uniqueErrors(errors),
  };
};
