/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityDefinitionsClient, RegisteredEntityDefinition } from '@kbn/entity-store/server';
import { isEqual, pick } from 'lodash';
import { MANAGED_BY } from '../definitions/constants';
import { InventoryTypeDefinitionError, InventoryTypeNotFoundError } from './errors';
import {
  applyLimit,
  applyValueLabels,
  executeEsql,
  fillColumns,
  interpretPlanResult,
  mergeRows,
  orderRows,
  planRowLimit,
  summarizeResults,
  toSourceError,
} from './executor';
import type { EsqlQueryResult, PlanResult, SourceError } from './executor';
import {
  ENTITY_ID_COLUMN,
  buildColumns,
  generateListQueries,
  getDynamicBlock,
  planSources,
  resolveIdentityPlan,
} from './generator';
import type { GeneratedQuery, IdentityPlan, OutputColumn, QueryPlan } from './generator';
import type {
  GetTypesResponse,
  InventoryType,
  ListQueryReport,
  ListRequest,
  ListResponse,
  UnavailableColumn,
} from './types';

/** Everything the list queries are generated from. */
interface ListPlan {
  plans: QueryPlan[];
  identity: IdentityPlan;
  columns: OutputColumn[];
  queries: GeneratedQuery[];
}

const toQueryReport = (
  { indexPattern }: QueryPlan,
  { esql, params }: GeneratedQuery,
  outcome: PromiseSettledResult<EsqlQueryResult>
): ListQueryReport => {
  if (outcome.status === 'rejected') {
    return { indexPattern, esql, params, took: null, documentsFound: null, rowCount: null };
  }
  const { took, documentsFound, rowCount } = outcome.value.stats;
  return { indexPattern, esql, params, took, documentsFound, rowCount };
};

const toUnavailableColumns = (
  { index, indexPattern }: QueryPlan,
  unavailableFields: string[],
  columns: OutputColumn[]
): UnavailableColumn[] =>
  columns.flatMap(({ name, fieldByPlan }) => {
    const field = fieldByPlan?.[index];
    return field !== undefined && unavailableFields.includes(field)
      ? [{ column: name, indexPattern, field }]
      : [];
  });

export class InventoryService {
  constructor(
    private readonly definitionsClient: Pick<EntityDefinitionsClient, 'get' | 'list'>,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  /**
   * Returns one entry per registered definition that has a `dynamic` block and `managedBy` equal to
   * `MANAGED_BY` (registered by this plugin), in registry order.
   * Skips a definition that throws `InventoryDefinitionError` after logging a warning, and rethrows any other error.
   */
  listTypes = async (): Promise<GetTypesResponse> => {
    const definitions = await this.definitionsClient.list();
    const types = definitions.flatMap((definition) => {
      if (!definition.dynamic || !isEqual(definition.managedBy, MANAGED_BY)) {
        return [];
      }
      try {
        return [this.buildType(definition)];
      } catch (error) {
        if (error.name !== 'InventoryDefinitionError') {
          throw error;
        }
        this.logger.warn(`Entity inventory skipped type "${definition.type}": ${error.message}`);
        return [];
      }
    });
    return { types };
  };

  /**
   * Lists the entities of a type seen in the window: one `FROM` query per source over every index
   * behind its pattern, run concurrently and merged by `entity.id`, newest `last_seen` first.
   * Throws `InventoryTypeNotFoundError` when this plugin registered no `dynamic` definition for the
   * type and `InventoryTypeDefinitionError` when the definition cannot be turned into queries. A
   * query that fails or reads nothing usable is reported in `errors[]` and never fails the request.
   */
  list = async ({ type, window, limit }: ListRequest): Promise<ListResponse> => {
    const startedAt = Date.now();
    const definition = await this.definitionsClient.get(type);
    if (!definition?.dynamic || !isEqual(definition.managedBy, MANAGED_BY)) {
      throw new InventoryTypeNotFoundError(type);
    }
    const { plans, identity, columns, queries } = this.planList(definition, window, limit);

    // Settled, not raced: one failing source must not hide the rows of the others.
    const outcomes = await Promise.allSettled(
      queries.map((query) => executeEsql(this.esClient, query))
    );

    const errors: SourceError[] = [];
    const unavailableColumns: UnavailableColumn[] = [];
    const results = outcomes.flatMap((outcome, planIndex): PlanResult[] => {
      const plan = plans[planIndex];
      if (outcome.status === 'rejected') {
        errors.push(toSourceError(plan.indexPattern, outcome.reason));
        return [];
      }
      const { columns: resultColumns, rows, isPartial } = outcome.value;
      const result: PlanResult = { plan, columns: resultColumns, rows, isPartial };
      const { usable, reason, unavailableFields } = interpretPlanResult(result, identity, columns);
      if (!usable) {
        errors.push({
          indexPattern: plan.indexPattern,
          status: null,
          reason: reason ?? 'unusable',
        });
        return [];
      }
      unavailableColumns.push(...toUnavailableColumns(plan, unavailableFields, columns));
      return [{ ...result, rows: applyValueLabels(rows, plan) }];
    });

    const merged = mergeRows(results, columns);
    const ordered = orderRows(merged.rows);
    const { total, truncated } = summarizeResults(results, limit, ordered.length);
    const rows = fillColumns(applyLimit(ordered, limit), columns);
    const returnedIds = rows.map((row) => String(row[ENTITY_ID_COLUMN]));

    return {
      columns: merged.columns,
      rows,
      provenance: pick(merged.provenance, returnedIds),
      total,
      truncated,
      took: Date.now() - startedAt,
      queries: plans.map((plan, planIndex) =>
        toQueryReport(plan, queries[planIndex], outcomes[planIndex])
      ),
      errors,
      unavailableColumns,
    };
  };

  /**
   * Plans one full-pattern `FROM` query per source; the probe is not run, so no source gets a `TS`
   * plan. Rethrows `InventoryDefinitionError` as `InventoryTypeDefinitionError`.
   */
  private planList = (
    definition: RegisteredEntityDefinition,
    window: ListRequest['window'],
    limit: number
  ): ListPlan => {
    try {
      const { sources } = getDynamicBlock(definition);
      const plans = planSources(
        definition,
        sources.map(() => ({ hasTimeSeries: false }))
      );
      const identity = resolveIdentityPlan(definition);
      const columns = buildColumns(definition, plans, identity);
      const queries = generateListQueries(definition, plans, window, planRowLimit(limit));
      return { plans, identity, columns, queries };
    } catch (error) {
      if (error.name !== 'InventoryDefinitionError') {
        throw error;
      }
      throw new InventoryTypeDefinitionError(definition.type, error.message);
    }
  };

  private buildType = (definition: RegisteredEntityDefinition): InventoryType => {
    const { type, name, description } = definition;
    const { sources } = getDynamicBlock(definition);
    const identityPlan = resolveIdentityPlan(definition);
    const columns = buildColumns(
      definition,
      sources.map(({ attributes }, index) => ({ index, attributes: attributes ?? [] })),
      identityPlan
    );
    return {
      type,
      name,
      description,
      identityFields: identityPlan.groupingFields,
      columns: columns.map(({ name: columnName, kind }) => ({ name: columnName, kind })),
      sources: sources.map(({ indexPattern, filter }) => ({ indexPattern, filter })),
    };
  };
}
