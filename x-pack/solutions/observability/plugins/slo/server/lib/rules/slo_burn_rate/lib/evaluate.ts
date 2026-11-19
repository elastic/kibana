/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { BURN_RATE_EXECUTOR_SPAN_NAMES, MAX_EVALUATION_RESULTS } from '../constants';
import type { SLODefinition } from '../../../../domain/models';
import { Duration, toDurationUnit } from '../../../../domain/models';
import type { BurnRateRuleParams, WindowSchema } from '../types';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../../../../common/constants';
import { buildEvaluationFilter, buildEvaluationQuery, EVALUATION_COLUMNS } from './build_query';

export interface BreachingInstance {
  instanceId: string;
  shouldAlert: boolean;
  longWindowBurnRate: number;
  shortWindowBurnRate: number;
  shortWindowDuration: Duration;
  longWindowDuration: Duration;
  window: WindowSchema;
}

export interface EvaluationResult extends BreachingInstance {
  groupings?: Record<string, unknown>;
}

export interface EvaluateOptions {
  projectRouting?: string;
  limit?: number;
}

interface GroupingsDocument {
  slo?: {
    instanceId?: string;
    groupings?: Record<string, unknown>;
  };
}

/**
 * Returns the instances breaching at least one burn rate window, highest priority window first.
 */
export async function findBreachingInstances(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  startedAt: Date,
  { projectRouting, limit = MAX_EVALUATION_RESULTS }: EvaluateOptions = {}
): Promise<BreachingInstance[]> {
  if (params.windows.length === 0) {
    return [];
  }

  const boundedLimit = Math.max(1, Math.min(Math.floor(limit), MAX_EVALUATION_RESULTS));
  const {
    query,
    params: queryParams,
    filter,
  } = buildEvaluationQuery(startedAt, slo, params, boundedLimit);
  const response = await withSpan(
    { name: BURN_RATE_EXECUTOR_SPAN_NAMES.ES_QUERY, type: 'rule' },
    () =>
      esClient.esql.query({
        query,
        params: queryParams,
        filter,
        ...(projectRouting ? { project_routing: projectRouting } : {}),
      })
  );

  const columnIndex = (name: string) =>
    response.columns.findIndex((column) => column.name === name);
  const instanceIdIndex = columnIndex(EVALUATION_COLUMNS.instanceId);
  const windowIndexIndex = columnIndex(EVALUATION_COLUMNS.windowIndex);
  const shortWindowBurnRateIndex = columnIndex(EVALUATION_COLUMNS.shortWindowBurnRate);
  const longWindowBurnRateIndex = columnIndex(EVALUATION_COLUMNS.longWindowBurnRate);

  return response.values.map((row) => {
    const instanceId = String(row[instanceIdIndex]);
    const window = params.windows[Number(row[windowIndexIndex])];
    if (!window) {
      throw new Error(`Evaluation query for ${instanceId} failed.`);
    }

    return {
      instanceId,
      shouldAlert: true,
      shortWindowBurnRate: Number(row[shortWindowBurnRateIndex] ?? 0),
      longWindowBurnRate: Number(row[longWindowBurnRateIndex] ?? 0),
      shortWindowDuration: new Duration(
        window.shortWindow.value,
        toDurationUnit(window.shortWindow.unit)
      ),
      longWindowDuration: new Duration(
        window.longWindow.value,
        toDurationUnit(window.longWindow.unit)
      ),
      window,
    };
  });
}

/**
 * Returns the breaching instances with their groupings, highest priority window first.
 */
export async function evaluate(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  startedAt: Date,
  options: EvaluateOptions = {}
): Promise<EvaluationResult[]> {
  const breachingInstances = await findBreachingInstances(
    esClient,
    slo,
    params,
    startedAt,
    options
  );
  if (breachingInstances.length === 0) {
    return [];
  }

  const groupingsByInstanceId = await findGroupings(
    esClient,
    slo,
    params,
    startedAt,
    breachingInstances.map(({ instanceId }) => instanceId),
    options.projectRouting
  );

  return breachingInstances.map((instance) => ({
    ...instance,
    groupings: groupingsByInstanceId.get(instance.instanceId),
  }));
}

async function findGroupings(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  startedAt: Date,
  instanceIds: string[],
  projectRouting?: string
): Promise<Map<string, Record<string, unknown> | undefined>> {
  const filter = buildEvaluationFilter(startedAt, slo, params);
  const response = await withSpan(
    { name: BURN_RATE_EXECUTOR_SPAN_NAMES.GROUPINGS_QUERY, type: 'rule' },
    () =>
      esClient.search<GroupingsDocument>({
        index: SLI_DESTINATION_INDEX_PATTERN,
        ...(projectRouting ? { project_routing: projectRouting } : {}),
        size: instanceIds.length,
        _source: ['slo.instanceId', 'slo.groupings'],
        query: {
          bool: {
            filter: [filter, { terms: { 'slo.instanceId': instanceIds } }],
          },
        },
        collapse: { field: 'slo.instanceId' },
      })
  );

  const groupingsByInstanceId = new Map<string, Record<string, unknown> | undefined>();
  for (const { _source } of response.hits.hits) {
    if (_source?.slo?.instanceId) {
      groupingsByInstanceId.set(_source.slo.instanceId, _source.slo.groupings);
    }
  }
  return groupingsByInstanceId;
}
