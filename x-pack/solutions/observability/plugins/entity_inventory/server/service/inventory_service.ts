/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityDefinitionsClient, RegisteredEntityDefinition } from '@kbn/entity-store/server';
import type {
  AttributeValuesResponse,
  GetTypesResponse,
  InventoryRow,
  InventoryType,
  InventoryTypeColumn,
  ListProbeDiagnostic,
  ListQueryDiagnostic,
  ListResponse,
  PlanResponse,
  Provenance,
  QueryExecutionStats,
  SourceError,
  UnavailableColumn,
} from '../../common';
import { InventoryTypeDefinitionError } from '../inventory/errors/inventory_type_definition_error';
import { InventoryTypeNotFoundError } from '../inventory/errors/inventory_type_not_found_error';
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
  toEsqlRequestBody,
  toErrorDetail,
} from '../inventory/executor';
import type { EsqlQueryResult, EsqlStats, PlanResult, ProbeResult } from '../inventory/executor';
import {
  buildColumns,
  ENTITY_ID_COLUMN,
  generateListQueries,
  getDynamicBlock,
  planSources,
  resolveIdentityPlan,
} from '../inventory/generator';
import type { GeneratedQuery, IdentityPlan, OutputColumn, QueryPlan } from '../inventory/generator';
import type { ListAttributeValuesRequest, ListRequest } from '../inventory/types';
import { listAttributeValues } from './list_attribute_values';

/** Everything the list queries are generated from. */
interface ListPlan {
  /** The probe of each distinct source pattern, in source order. */
  probes: Map<string, ProbeResult>;
  /** The plans to run; a source whose probe failed has none here or in `queries`. */
  plans: QueryPlan[];
  identity: IdentityPlan;
  columns: OutputColumn[];
  queries: GeneratedQuery[];
  /** Wall time of the concurrent probes, in fractional milliseconds. */
  probesMs: number;
}

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

type ExecutionStats = Omit<QueryExecutionStats, 'isPartial'>;

const NO_EXECUTION_STATS: ExecutionStats = {
  took: null,
  documentsFound: null,
  valuesLoaded: null,
  rowsEmitted: null,
  cpuNanos: null,
  driverNanos: null,
  bytesRead: null,
  shards: null,
};

const toExecutionStats = (stats: EsqlStats | null): ExecutionStats => {
  if (stats === null) {
    return NO_EXECUTION_STATS;
  }
  const {
    took,
    documentsFound,
    valuesLoaded,
    rowsEmitted,
    cpuNanos,
    driverNanos,
    bytesRead,
    shards,
  } = stats;
  return {
    took,
    documentsFound,
    valuesLoaded,
    rowsEmitted,
    cpuNanos,
    driverNanos,
    bytesRead,
    shards,
  };
};

const toQueryDiagnostic = (
  { indexPattern, engine }: QueryPlan,
  { esql, params }: GeneratedQuery,
  outcome: PromiseSettledResult<EsqlQueryResult>,
  error: SourceError | null
): ListQueryDiagnostic => {
  const base = { indexPattern, engine, esql, params, error };
  if (outcome.status === 'rejected') {
    return { ...base, ...NO_EXECUTION_STATS, rowCount: 0, isPartial: null };
  }
  const { stats, isPartial } = outcome.value;
  return { ...base, ...toExecutionStats(stats), rowCount: stats.rowCount, isPartial };
};

const toProbeOutcome = (probe: ProbeResult): ListProbeDiagnostic['outcome'] => {
  if (probe.failed) {
    return 'failed';
  }
  return probe.hasTimeSeries ? 'time_series' : 'no_time_series';
};

const toProbeError = (probe: ProbeResult): SourceError | null =>
  probe.failed ? { kind: 'failed', status: probe.status, reason: probe.reason } : null;

const toProbeDiagnostic = (indexPattern: string, probe: ProbeResult): ListProbeDiagnostic => {
  const {
    query: { esql, params },
    execution: { stats, isPartial },
  } = probe;
  return {
    indexPattern,
    esql,
    params,
    outcome: toProbeOutcome(probe),
    ...toExecutionStats(stats),
    isPartial,
    error: toProbeError(probe),
  };
};

const toResponseColumns = (columns: OutputColumn[]): InventoryTypeColumn[] =>
  columns.map(({ name, kind }) => ({ name, kind }));

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
   * source whose probe failed runs no plan, and a query that fails or reads nothing usable loses its
   * rows; each is reported in the `error` of its probe or query and never fails the request. A
   * partial result keeps its rows. `truncated` is true only when the row limit left rows out.
   * `queries[]` lists every plan query sent and `probes[]` every probe, each with the stats
   * Elasticsearch returned; `provenance` covers the returned rows only, and `timings` gives the wall time
   * of the whole call (`totalMs`) and of each phase, measured with `performance.now()`.
   */
  list = async ({ type, window, limit, signal }: ListRequest): Promise<ListResponse> => {
    const startedAtMs = performance.now();
    const definition = await this.getDynamicDefinition(type);
    const definedAtMs = performance.now();
    const { probes, plans, identity, columns, queries, probesMs } = await this.planList(
      definition,
      window,
      limit,
      signal
    );
    const plannedAtMs = performance.now();

    // Settled, not raced: one failing source must not hide the rows of the others.
    const outcomes = await Promise.allSettled(
      queries.map((query) => executeEsql(this.esClient, query, { signal }))
    );
    const queriedAtMs = performance.now();

    // One per plan: why its rows were lost, null when they were kept.
    const queryErrors: Array<SourceError | null> = plans.map(() => null);
    const unavailableColumns: UnavailableColumn[] = [];
    const results = outcomes.flatMap((outcome, planIndex): PlanResult[] => {
      const plan = plans[planIndex];
      if (outcome.status === 'rejected') {
        queryErrors[planIndex] = { kind: 'failed', ...toErrorDetail(outcome.reason) };
        return [];
      }
      const { columns: resultColumns, rows } = outcome.value;
      const result: PlanResult = { plan, columns: resultColumns, rows };
      const { usable, reason, unavailableFields } = interpretPlanResult(result, identity, columns);
      if (!usable) {
        queryErrors[planIndex] = { kind: 'unusable', status: null, reason: reason ?? 'unusable' };
        return [];
      }
      unavailableColumns.push(...toUnavailableColumns(plan, unavailableFields, columns));
      return [{ ...result, rows: applyValueLabels(rows, plan) }];
    });

    const merged = mergeRows(results, columns);
    const ordered = orderRows(merged.rows);
    const { truncated } = summarizeResults(results, limit, ordered.length);
    const rows = fillColumns(applyLimit(ordered, limit), columns);
    const processedAtMs = performance.now();

    return {
      columns: toResponseColumns(columns),
      rows,
      provenance: restrictProvenance(merged.provenance, rows),
      truncated,
      queries: outcomes.map((outcome, planIndex) =>
        toQueryDiagnostic(plans[planIndex], queries[planIndex], outcome, queryErrors[planIndex])
      ),
      probes: [...probes].map(([indexPattern, probe]) => toProbeDiagnostic(indexPattern, probe)),
      timings: {
        definitionMs: definedAtMs - startedAtMs,
        planningMs: plannedAtMs - definedAtMs,
        probesMs,
        queriesMs: queriedAtMs - plannedAtMs,
        processingMs: processedAtMs - queriedAtMs,
        totalMs: processedAtMs - startedAtMs,
      },
      unavailableColumns,
    };
  };

  /** Lists the values a dropdown can offer for an attribute; see `listAttributeValues`. */
  listAttributeValues = (request: ListAttributeValuesRequest): Promise<AttributeValuesResponse> =>
    listAttributeValues(
      {
        getDynamicDefinition: this.getDynamicDefinition,
        esClient: this.esClient,
        logger: this.logger,
      },
      request
    );

  /**
   * Plans the request exactly as `list` does, probes included, and returns the probes and the list
   * queries `list` would send as `POST /_query` bodies, without running the list queries.
   * Throws as `list` does.
   */
  plan = async ({ type, window, limit, signal }: ListRequest): Promise<PlanResponse> => {
    const definition = await this.getDynamicDefinition(type);
    const { probes, plans, queries } = await this.planList(definition, window, limit, signal);
    return {
      probes: [...probes].map(([indexPattern, probe]) => ({
        indexPattern,
        request: toEsqlRequestBody(probe.query),
        hasTimeSeries: probe.failed ? null : probe.hasTimeSeries,
        error: toProbeError(probe),
      })),
      queries: plans.map(({ indexPattern, engine }, position) => ({
        indexPattern,
        engine,
        request: toEsqlRequestBody(queries[position]),
      })),
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
   * runs no query, and its probe carries the error. Rethrows `InventoryDefinitionError` as
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
      const probesStartedAtMs = performance.now();
      const probes = await probeSources(
        this.esClient,
        sources.map(({ indexPattern }) => indexPattern),
        { signal }
      );
      const probesMs = performance.now() - probesStartedAtMs;
      const failedPatterns = new Set(
        [...probes].flatMap(([indexPattern, { failed }]) => (failed ? [indexPattern] : []))
      );

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
        probes,
        plans: runnable.map(({ plan }) => plan),
        identity,
        columns,
        queries: runnable.map(({ query }) => query),
        probesMs,
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
    const { sources, suggestedFilters = [] } = getDynamicBlock(definition);
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
      columns: toResponseColumns(columns),
      suggestedFilters,
      sources: sources.map(({ indexPattern, filter }) => ({ indexPattern, filter })),
    };
  };
}
