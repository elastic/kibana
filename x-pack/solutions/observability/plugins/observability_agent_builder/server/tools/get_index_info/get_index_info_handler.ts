/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IScopedClusterClient, Logger } from '@kbn/core/server';
import { compact, mapValues, pickBy } from 'lodash';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getObservabilityDataSources } from '../../utils/get_observability_data_sources';
import { CURATED_OBSERVABILITY_FIELDS } from './curated_fields';
import { getFieldType } from './utils';

interface DataSources {
  apm: { transaction: string; span: string; error: string; metric: string };
  logs: string[];
  metrics: string[];
  alerts: string[];
  [key: string]: unknown;
}

interface CuratedFieldInfo {
  name: string;
  type: string;
  isOtel: boolean;
  [key: string]: unknown;
}

export interface IndexInfoResult {
  curatedFields: CuratedFieldInfo[];
  schemas: { hasEcsData: boolean; hasOtelData: boolean };
  dataSources: DataSources;
  [key: string]: unknown;
}

/** Fetches field types for a list of fields, returning a map of fieldName -> type */
async function getExistingFieldTypes(
  esClient: IScopedClusterClient,
  indices: string[],
  fields: string[],
  logger: Logger
): Promise<Record<string, string>> {
  try {
    const response = await esClient.asCurrentUser.fieldCaps({
      index: indices,
      fields,
      ignore_unavailable: true,
      allow_no_indices: true,
      filters: '-metadata',
    });
    return pickBy(mapValues(response.fields, getFieldType)) as Record<string, string>;
  } catch (error) {
    logger.warn(`Error checking field caps: ${error.message}`);
    return {};
  }
}

/**
 * Returns curated observability fields that exist in the cluster, plus data sources.
 */
export async function getIndexInfoHandler({
  core,
  plugins,
  logger,
  esClient,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
}): Promise<IndexInfoResult> {
  const sources = await getObservabilityDataSources({ core, plugins, logger });

  const indices = compact([
    ...sources.logIndexPatterns,
    ...sources.metricIndexPatterns,
    sources.apmIndexPatterns.transaction,
    sources.apmIndexPatterns.span,
    sources.apmIndexPatterns.error,
    sources.apmIndexPatterns.metric,
  ]);

  // Collect field names from curated list (both ECS and OTel variants)
  const curatedFieldNames = CURATED_OBSERVABILITY_FIELDS.flatMap((f) => compact([f.ecs, f.otel]));

  // Check which fields exist - build a map of fieldName -> type
  const existingFields = await getExistingFieldTypes(esClient, indices, curatedFieldNames, logger);

  // Build curated fields list (prefer ECS, fallback to OTel)
  const curatedFields = compact(
    CURATED_OBSERVABILITY_FIELDS.map((field): CuratedFieldInfo | undefined => {
      const ecsType = existingFields[field.ecs];
      const otelType = field.otel ? existingFields[field.otel] : undefined;

      if (ecsType) {
        return { name: field.ecs, type: ecsType, isOtel: false };
      }
      if (otelType) {
        return { name: field.otel!, type: otelType, isOtel: true };
      }
      return undefined;
    })
  );

  const hasEcsData = curatedFields.some((f) => !f.isOtel);
  const hasOtelData = curatedFields.some((f) => f.isOtel);

  return {
    curatedFields,
    schemas: { hasEcsData, hasOtelData },
    dataSources: {
      apm: {
        transaction: sources.apmIndexPatterns.transaction,
        span: sources.apmIndexPatterns.span,
        error: sources.apmIndexPatterns.error,
        metric: sources.apmIndexPatterns.metric,
      },
      logs: sources.logIndexPatterns,
      metrics: sources.metricIndexPatterns,
      alerts: sources.alertsIndexPattern,
    },
  };
}
