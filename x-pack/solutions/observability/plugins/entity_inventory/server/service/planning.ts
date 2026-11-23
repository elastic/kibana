/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RegisteredEntityDefinition } from '@kbn/entity-store/server';
import type { SourceError } from '../../common';
import { InventoryTypeDefinitionError } from '../inventory/errors/inventory_type_definition_error';
import { probeSources } from '../inventory/executor';
import type { ProbeResult } from '../inventory/executor';
import { getDynamicBlock, planSources } from '../inventory/generator';
import type { QueryPlan } from '../inventory/generator';

export interface SourceProbes {
  /** The probe of each distinct source pattern, in source order. */
  results: Map<string, ProbeResult>;
  /** One entry per source whose probe failed. */
  errors: SourceError[];
  /** The patterns whose probe failed. */
  failedPatterns: ReadonlySet<string>;
  /** Wall time of the concurrent probes, in fractional milliseconds. */
  durationMs: number;
}

/**
 * Probes every source pattern, then plans one `FROM` query per source and a `TS` query before it
 * where the probe found a time-series index. Throws `InventoryDefinitionError` when the
 * definition cannot be planned.
 */
export const probeAndPlanSources = async (
  esClient: ElasticsearchClient,
  definition: RegisteredEntityDefinition,
  signal: AbortSignal | undefined
): Promise<{ probes: SourceProbes; allPlans: QueryPlan[] }> => {
  const { sources } = getDynamicBlock(definition);
  const probesStartedAtMs = performance.now();
  const results = await probeSources(
    esClient,
    sources.map(({ indexPattern }) => indexPattern),
    { signal }
  );
  const durationMs = performance.now() - probesStartedAtMs;
  const errors: SourceError[] = [];
  results.forEach((probe, indexPattern) => {
    if (probe.failed) {
      errors.push({ indexPattern, status: probe.status, reason: probe.reason });
    }
  });
  const failedPatterns = new Set(errors.map(({ indexPattern }) => indexPattern));

  const allPlans = planSources(
    definition,
    sources.map(({ indexPattern }) => {
      const probe = results.get(indexPattern);
      return { hasTimeSeries: probe !== undefined && !probe.failed && probe.hasTimeSeries };
    })
  );
  return { probes: { results, errors, failedPatterns, durationMs }, allPlans };
};

/**
 * Returns what to throw for an error raised while planning `definition`: an
 * `InventoryDefinitionError` becomes `InventoryTypeDefinitionError`, after logging it at error
 * level since a registered definition that cannot be queried is a server bug, not a problem with
 * the request. Any other error is returned unchanged.
 */
export const toTypeDefinitionError = (
  logger: Logger,
  definition: RegisteredEntityDefinition,
  error: Error
): Error => {
  if (error.name !== 'InventoryDefinitionError') {
    return error;
  }
  const definitionError = new InventoryTypeDefinitionError(definition.type, error.message);
  logger.error(definitionError.message);
  return definitionError;
};
