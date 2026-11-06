/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityDefinitionsClient, RegisteredEntityDefinition } from '@kbn/entity-store/server';
import { InventoryTypeDefinitionError, InventoryTypeNotFoundError } from '../inventory/errors';
import {
  applyLimit,
  applyValueLabels,
  executeEsql,
  fillColumns,
  interpretPlanResult,
  mergeRows,
  orderRows,
  planRowLimit,
  probeSources,
  summarizeResults,
  toSourceError,
} from '../inventory/executor';
import type {
  EsqlQueryResult,
  InventoryRow,
  PlanResult,
  Provenance,
  SourceError,
} from '../inventory/executor';
import {
  buildColumns,
  ENTITY_ID_COLUMN,
  generateListQueries,
  getDynamicBlock,
  planSources,
  resolveIdentityPlan,
} from '../inventory/generator';
import type { GeneratedQuery, IdentityPlan, OutputColumn, QueryPlan } from '../inventory/generator';
import type { ListRequest } from '../inventory/types';
import type {
  GetTypesResponse,
  InventoryType,
  ListQueryDiagnostic,
  ListResponse,
  UnavailableColumn,
} from '../routes/types';

/** Everything the list queries are generated from. */
interface ListPlan {
  plans: QueryPlan[];
  identity: IdentityPlan;
  columns: OutputColumn[];
  queries: GeneratedQuery[];
  /** One entry per source whose probe failed; its plans are left out of `plans` and `queries`. */
  probeErrors: SourceError[];
}

// The `errors[]` reason for a plan whose response has `is_partial: true`.
const PARTIAL_RESULT_REASON =
  'partial result: some shards or clusters did not answer, so rows may be missing';

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

const toQueryDiagnostic = (
  { indexPattern, engine }: QueryPlan,
  { esql, params }: GeneratedQuery,
  outcome: PromiseSettledResult<EsqlQueryResult>
): ListQueryDiagnostic => {
  const stats =
    outcome.status === 'fulfilled'
      ? outcome.value.stats
      : { took: null, documentsFound: null, rowCount: 0 };
  return {
    indexPattern,
    engine,
    esql,
    params,
    took: stats.took,
    documentsFound: stats.documentsFound,
    rowCount: stats.rowCount,
  };
};

const restrictProvenance = (provenance: Provenance, rows: InventoryRow[]): Provenance =>
  Object.fromEntries(
    rows.flatMap((row) => {
      const entityId = row[ENTITY_ID_COLUMN];
      return typeof entityId === 'string' && entityId in provenance
        ? [[entityId, provenance[entityId]]]
        : [];
    })
  );

export class InventoryService {
  constructor(
    private readonly definitionsClient: Pick<EntityDefinitionsClient, 'get' | 'list'>,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  /**
   * Returns one entry per registered definition that has a `dynamic` block, in registry order.
   * Skips a definition that throws `InventoryDefinitionError` after logging a warning, and rethrows any other error.
   */
  listTypes = async (): Promise<GetTypesResponse> => {
    const definitions = await this.definitionsClient.list();
    const types = definitions.flatMap((definition) => {
      if (!this.hasDynamicDefinition(definition)) {
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
   * Lists the entities of a type seen in the window: probes every source pattern, then runs one
   * query per plan concurrently (a `TS` plan beside the `FROM` plan of a source that has a
   * time-series index) and merges the rows by `entity.id`, newest `last_seen` first.
   * Throws `InventoryTypeNotFoundError` when no `dynamic` definition is registered for the type and `InventoryTypeDefinitionError` when the definition cannot be turned into queries. A
   * source whose probe failed runs no plan, and a query that fails or reads nothing usable is
   * reported in `errors[]`; neither fails the request. A partial result is also reported in
   * `errors[]` and its rows are kept. A failed probe or query or a partial result makes `total`
   * null, since the entities of that source are unknown; `truncated` is true only when the row
   * limit left rows out. `queries[]` lists every plan query sent, `provenance` covers the returned
   * rows only, and `took` is the wall time of the whole call.
   */
  list = async ({ type, window, limit, signal }: ListRequest): Promise<ListResponse> => {
    const startedAt = Date.now();
    const definition = await this.getDynamicDefinition(type);
    const { plans, identity, columns, queries, probeErrors } = await this.planList(
      definition,
      window,
      limit,
      signal
    );

    // Settled, not raced: one failing source must not hide the rows of the others.
    const outcomes = await Promise.allSettled(
      queries.map((query) => executeEsql(this.esClient, query, { signal }))
    );

    const errors: SourceError[] = [...probeErrors];
    const failedQueries = outcomes.filter(({ status }) => status === 'rejected').length;
    const unavailableColumns: UnavailableColumn[] = [];
    const results = outcomes.flatMap((outcome, planIndex): PlanResult[] => {
      const plan = plans[planIndex];
      if (outcome.status === 'rejected') {
        errors.push(toSourceError(plan.indexPattern, outcome.reason));
        return [];
      }
      const { columns: resultColumns, rows, isPartial } = outcome.value;
      const result: PlanResult = { plan, columns: resultColumns, rows, isPartial };
      if (isPartial) {
        errors.push({
          indexPattern: plan.indexPattern,
          status: null,
          reason: PARTIAL_RESULT_REASON,
        });
      }
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
    // A plan that read nothing usable is not a failure: its pattern holds no data the user can read.
    const incomplete = probeErrors.length > 0 || failedQueries > 0;

    return {
      columns: merged.columns,
      rows,
      provenance: restrictProvenance(merged.provenance, rows),
      total: incomplete ? null : total,
      truncated,
      took: Date.now() - startedAt,
      queries: outcomes.map((outcome, planIndex) =>
        toQueryDiagnostic(plans[planIndex], queries[planIndex], outcome)
      ),
      errors,
      unavailableColumns,
    };
  };

  private hasDynamicDefinition = (definition: RegisteredEntityDefinition): boolean =>
    Boolean(definition.dynamic);

  /**
   * Returns the definition of `type` when it has a `dynamic` block. Throws
   * `InventoryTypeNotFoundError` when the entity store has no definition for the type, or the
   * definition has no `dynamic` block.
   */
  private getDynamicDefinition = async (type: string): Promise<RegisteredEntityDefinition> => {
    const definition = await this.definitionsClient.get(type);
    if (!definition) {
      throw new InventoryTypeNotFoundError(type, 'no entity definition is registered for it');
    }
    if (!this.hasDynamicDefinition(definition)) {
      throw new InventoryTypeNotFoundError(type, 'its entity definition has no dynamic block');
    }
    return definition;
  };

  /**
   * Probes every source pattern, then plans one `FROM` query per source and a `TS` query before it
   * where the probe found a time-series index. The columns and queries come from every plan, so a
   * definition error never depends on a probe; a source whose probe failed keeps its columns but
   * runs no query, and is reported in `probeErrors`. Rethrows `InventoryDefinitionError` as
   * `InventoryTypeDefinitionError` after logging it at error level: a registered definition that
   * cannot be queried is a server bug, not a problem with the request.
   */
  private planList = async (
    definition: RegisteredEntityDefinition,
    window: ListRequest['window'],
    limit: number,
    signal: AbortSignal | undefined
  ): Promise<ListPlan> => {
    try {
      const { sources } = getDynamicBlock(definition);
      const probes = await probeSources(
        this.esClient,
        sources.map(({ indexPattern }) => indexPattern),
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
      const identity = resolveIdentityPlan(definition);
      const columns = buildColumns(definition, allPlans, identity);
      const allQueries = generateListQueries(definition, allPlans, window, planRowLimit(limit));
      const runnable = allPlans.flatMap((plan, position) =>
        failedPatterns.has(plan.indexPattern) ? [] : [{ plan, query: allQueries[position] }]
      );
      return {
        plans: runnable.map(({ plan }) => plan),
        identity,
        columns,
        queries: runnable.map(({ query }) => query),
        probeErrors,
      };
    } catch (error) {
      if (error.name !== 'InventoryDefinitionError') {
        throw error;
      }
      const definitionError = new InventoryTypeDefinitionError(definition.type, error.message);
      this.logger.error(definitionError.message);
      throw definitionError;
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
