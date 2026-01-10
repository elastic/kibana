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
import {
  getObservabilityDataSources,
  type ObservabilityDataSources,
} from '../../utils/get_observability_data_sources';
import { CURATED_OBSERVABILITY_FIELDS } from './curated_fields';
import { getFieldType } from './utils';

interface DataSources {
  apm: { transaction: string; span: string; error: string; metric: string };
  logs: string[];
  metrics: string[];
  alerts: string[];
}

interface CuratedFieldInfo {
  name: string;
  type: string;
  schema: 'ecs' | 'otel' | 'internal';
}

export interface IndexOverviewResult {
  curatedFields: CuratedFieldInfo[];
  schemas: { hasEcsData: boolean; hasOtelData: boolean };
  dataSources: DataSources;
}

/** Fetches field types for a list of fields, returning a map of fieldName -> type */
async function getExistingFieldTypes({
  esClient,
  dataSources,
  fields,
  logger,
}: {
  esClient: IScopedClusterClient;
  dataSources: ObservabilityDataSources;
  fields: string[];
  logger: Logger;
}): Promise<Record<string, string>> {
  const indices = compact([
    ...dataSources.logIndexPatterns,
    ...dataSources.metricIndexPatterns,
    ...dataSources.alertsIndexPattern,
    dataSources.apmIndexPatterns.transaction,
    dataSources.apmIndexPatterns.span,
    dataSources.apmIndexPatterns.error,
    dataSources.apmIndexPatterns.metric,
  ]);

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
export async function getIndexOverviewHandler({
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
}): Promise<IndexOverviewResult> {
  const dataSources = await getObservabilityDataSources({ core, plugins, logger });

  // Collect field names from curated list (ECS, OTel, and internal field names)
  const curatedFieldNames = CURATED_OBSERVABILITY_FIELDS.flatMap((f) =>
    compact([f.ecs, f.otel, f.internal])
  );

  // Check which fields exist - build a map of fieldName -> type
  const existingFields = await getExistingFieldTypes({
    esClient,
    dataSources,
    fields: curatedFieldNames,
    logger,
  });

  // Build curated fields list (prefer ECS > OTel > internal)
  const curatedFields = compact(
    CURATED_OBSERVABILITY_FIELDS.map((field) => {
      const variants = [
        { name: field.ecs, schema: 'ecs' as const },
        { name: field.otel, schema: 'otel' as const },
        { name: field.internal, schema: 'internal' as const },
      ];
      const match = variants.find((v) => v.name && existingFields[v.name]);
      if (match && match.name) {
        return { name: match.name, type: existingFields[match.name], schema: match.schema };
      }
    })
  );

  const hasEcsData = curatedFields.some((f) => f.schema === 'ecs');
  const hasOtelData = curatedFields.some((f) => f.schema === 'otel');

  return {
    curatedFields,
    schemas: { hasEcsData, hasOtelData },
    dataSources: {
      apm: {
        transaction: dataSources.apmIndexPatterns.transaction,
        span: dataSources.apmIndexPatterns.span,
        error: dataSources.apmIndexPatterns.error,
        metric: dataSources.apmIndexPatterns.metric,
      },
      logs: dataSources.logIndexPatterns,
      metrics: dataSources.metricIndexPatterns,
      alerts: dataSources.alertsIndexPattern,
    },
  };
}
