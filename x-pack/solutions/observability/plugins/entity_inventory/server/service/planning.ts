/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RegisteredEntityDefinition } from '@kbn/entity-store/server';
import { InventoryTypeDefinitionError } from '../inventory/errors/inventory_type_definition_error';
import { probeSources } from '../inventory/executor';
import type { SourceError } from '../inventory/executor';
import { getDynamicBlock, planSources } from '../inventory/generator';
import type { QueryPlan } from '../inventory/generator';

/**
 * Probes every source pattern, then plans one `FROM` query per source and a `TS` query before it
 * where the probe found a time-series index. A source whose probe failed is reported in
 * `probeErrors` and its pattern is in `failedPatterns`. Throws `InventoryDefinitionError` when
 * the definition cannot be planned.
 */
export const probeAndPlanSources = async (
  esClient: ElasticsearchClient,
  definition: RegisteredEntityDefinition,
  signal: AbortSignal | undefined
): Promise<{
  allPlans: QueryPlan[];
  probeErrors: SourceError[];
  failedPatterns: ReadonlySet<string>;
}> => {
  const { sources } = getDynamicBlock(definition);
  const probes = await probeSources(
    esClient,
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
  return { allPlans, probeErrors, failedPatterns };
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
