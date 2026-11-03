/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { AnalysisTarget } from '@kbn/nightshift-ai';
import {
  METRIC_DEFINITION_FEATURE_TYPE,
  isMetricDefinitionUsage,
  metricDefinitionFeatureId,
  type FeatureUpsert,
  type MetricDefinitionUsage,
} from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { runEsqlQuery } from '../run_esql_query';
import { getColumnIndex } from '../../streams/esql';

export const METRIC_DEFINITION_PAGE_SIZE = 100;

const MAX_METRIC_DEFINITION_PAGES = 1_000;

const INTERNAL_DIMENSION_EXACT_NAMES = new Set(['_metric_names_hash', 'unit', 'temporality']);
const INTERNAL_DIMENSION_PREFIXES = ['labels._'];

const METRIC_USAGE_SCHEMA = {
  type: 'object',
  properties: {
    metrics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          usage: { type: 'string', enum: ['detection', 'rca'] },
        },
        required: ['id', 'usage'],
      },
    },
  },
  required: ['metrics'],
} as const;

export interface MetricsInfoRow {
  metric_name?: unknown;
  data_stream?: unknown;
  unit?: unknown;
  metric_type?: unknown;
  field_type?: unknown;
  dimension_fields?: unknown;
}

export interface IdentifyMetricDefinitionsOptions {
  target: AnalysisTarget;
  sourceId: string;
  /** Index patterns from the source query. The time-series gate reads these, not the view name. */
  indexPatterns?: string[];
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  kiClient: KnowledgeIndicatorClient;
  inferenceClient?: BoundInferenceClient;
  logger: Logger;
  signal?: AbortSignal;
  pageSize?: number;
}

export interface IdentifyMetricDefinitionsResult {
  features: FeatureUpsert[];
  errors: Array<{ feature: string; error: string }>;
}

interface PageCursor {
  metricName: string;
  dataStream: string;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const asStrings = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const firstString = (value: unknown): string | undefined => asStrings(value)[0];

const isInternalDimension = (name: string): boolean =>
  INTERNAL_DIMENSION_EXACT_NAMES.has(name) ||
  INTERNAL_DIMENSION_PREFIXES.some((prefix) => name.startsWith(prefix));

const quoteIdentifier = (value: string): string => `\`${value.replace(/[`\r\n]/g, '')}\``;

const quoteString = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const pageSizeOf = (pageSize: number | undefined): number => {
  if (pageSize === undefined) {
    return METRIC_DEFINITION_PAGE_SIZE;
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return METRIC_DEFINITION_PAGE_SIZE;
  }
  return Math.min(pageSize, METRIC_DEFINITION_PAGE_SIZE);
};

/** One feature per data stream named on a `METRICS_INFO` row. */
export function toMetricDefinitionFeatures(
  row: MetricsInfoRow,
  usageById?: ReadonlyMap<string, MetricDefinitionUsage>
): FeatureUpsert[] {
  const metricName = firstString(row.metric_name);
  const dataStreams = asStrings(row.data_stream);
  if (!metricName || dataStreams.length === 0) {
    return [];
  }

  const dimensionFields = asStrings(row.dimension_fields).filter(
    (name) => !isInternalDimension(name)
  );
  const unit = firstString(row.unit);
  const metricType = firstString(row.metric_type);
  const fieldType = firstString(row.field_type);

  return dataStreams.map((dataStream) => {
    const id = metricDefinitionFeatureId(dataStream, metricName);
    const usage = usageById?.get(id);
    return {
      id,
      type: METRIC_DEFINITION_FEATURE_TYPE,
      title: metricName,
      description: `${metricName} on ${dataStream}`,
      properties: {
        metric_name: metricName,
        data_stream: dataStream,
        ...(unit ? { unit } : {}),
        ...(metricType ? { metric_type: metricType } : {}),
        ...(fieldType ? { field_type: fieldType } : {}),
        dimension_fields: dimensionFields,
        ...(usage ? { usage } : {}),
      },
      confidence: 100,
    };
  });
}

const rowsFromResponse = (response: {
  columns: Array<{ name: string }>;
  values: unknown[][];
}): MetricsInfoRow[] => {
  const indexOf = (name: string) => getColumnIndex(response, name);
  const metricNameIndex = indexOf('metric_name');
  const dataStreamIndex = indexOf('data_stream');
  const unitIndex = indexOf('unit');
  const metricTypeIndex = indexOf('metric_type');
  const fieldTypeIndex = indexOf('field_type');
  const dimensionIndex = indexOf('dimension_fields');
  if (metricNameIndex === -1) {
    return [];
  }

  return response.values.map((value) => ({
    metric_name: value[metricNameIndex],
    data_stream: dataStreamIndex === -1 ? undefined : value[dataStreamIndex],
    unit: unitIndex === -1 ? undefined : value[unitIndex],
    metric_type: metricTypeIndex === -1 ? undefined : value[metricTypeIndex],
    field_type: fieldTypeIndex === -1 ? undefined : value[fieldTypeIndex],
    dimension_fields: dimensionIndex === -1 ? undefined : value[dimensionIndex],
  }));
};

const cursorFor = (row: MetricsInfoRow): PageCursor | undefined => {
  const metricName = firstString(row.metric_name);
  if (!metricName) {
    return undefined;
  }
  const dataStream = [...asStrings(row.data_stream)].sort().at(-1) ?? '';
  return { metricName, dataStream };
};

const metricsInfoQuery = (view: string, pageSize: number, cursor?: PageCursor): string => {
  const where = cursor
    ? ` | WHERE metric_name > ${quoteString(cursor.metricName)} OR (metric_name == ${quoteString(
        cursor.metricName
      )} AND data_stream > ${quoteString(cursor.dataStream)})`
    : '';
  return `TS ${quoteIdentifier(
    view
  )} | METRICS_INFO${where} | SORT metric_name, data_stream | LIMIT ${pageSize}`;
};

const indexModeIsTimeSeries = (settings: unknown): boolean => {
  if (!settings || typeof settings !== 'object') {
    return false;
  }
  const index = (settings as { index?: { mode?: unknown } }).index;
  return index?.mode === 'time_series';
};

const hasTimeSeriesIndex = async (
  esClient: ElasticsearchClient,
  indexPatterns: string[],
  logger: Logger
): Promise<boolean> => {
  const index = indexPatterns
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);
  if (index.length === 0) {
    return false;
  }

  try {
    const settings = await esClient.indices.getSettings({
      index,
      ignore_unavailable: true,
    });
    return Object.values(settings).some((entry) => indexModeIsTimeSeries(entry?.settings));
  } catch (error) {
    logger.warn(
      `Time series settings probe failed for [${index.join(', ')}]: ${errorMessage(error)}`
    );
    return false;
  }
};

const metricsWithDocuments = async ({
  esClient,
  features,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  features: FeatureUpsert[];
  start: number;
  end: number;
}): Promise<Set<string>> => {
  const from = new Date(start).toISOString();
  const to = new Date(end).toISOString();
  const byStream = new Map<string, FeatureUpsert[]>();
  for (const feature of features) {
    const dataStream = feature.properties.data_stream;
    if (typeof dataStream !== 'string' || dataStream.length === 0) {
      continue;
    }
    const group = byStream.get(dataStream) ?? [];
    group.push(feature);
    byStream.set(dataStream, group);
  }

  const live = new Set<string>();
  for (const [dataStream, group] of byStream) {
    const stats = group
      .map((feature, index) => {
        const field = String(feature.properties.metric_name);
        return `m${index} = COUNT(${quoteIdentifier(field)})`;
      })
      .join(', ');
    const query = `FROM ${quoteIdentifier(dataStream)} | WHERE @timestamp >= ${quoteString(
      from
    )} AND @timestamp < ${quoteString(to)} | STATS ${stats} | LIMIT 1`;
    const response = await runEsqlQuery(esClient, query);
    const counts = response?.values[0];
    if (!response || !counts) {
      continue;
    }
    group.forEach((feature, index) => {
      const column = getColumnIndex(response, `m${index}`);
      const count = column === -1 ? 0 : Number(counts[column] ?? 0);
      if (count > 0) {
        live.add(feature.id);
      }
    });
  }
  return live;
};

const classificationInput = (features: FeatureUpsert[]): string =>
  features
    .map((feature) => {
      const dimensions = Array.isArray(feature.properties.dimension_fields)
        ? feature.properties.dimension_fields.join(', ')
        : '';
      return [
        `id: ${feature.id}`,
        `metric_name: ${String(feature.properties.metric_name)}`,
        `metric_type: ${String(feature.properties.metric_type ?? '')}`,
        `unit: ${String(feature.properties.unit ?? '')}`,
        `dimensions: ${dimensions}`,
      ].join('\n');
    })
    .join('\n\n');

const classifyMetrics = async ({
  inferenceClient,
  features,
  signal,
}: {
  inferenceClient: BoundInferenceClient;
  features: FeatureUpsert[];
  signal?: AbortSignal;
}): Promise<Map<string, MetricDefinitionUsage>> => {
  const knownIds = new Set(features.map((feature) => feature.id));
  const response = await inferenceClient.output({
    id: 'classify_metric_definitions',
    system:
      'Classify each metric for an SRE. detection: a metric most customers would page on (symptom). rca: a metric used to explain a problem, not to page. Use only those two labels.',
    input: classificationInput(features),
    schema: METRIC_USAGE_SCHEMA,
    abortSignal: signal,
  });

  const labels = new Map<string, MetricDefinitionUsage>();
  for (const metric of response.output.metrics ?? []) {
    if (typeof metric.id !== 'string' || !knownIds.has(metric.id)) {
      continue;
    }
    if (isMetricDefinitionUsage(metric.usage)) {
      labels.set(metric.id, metric.usage);
    }
  }
  return labels;
};

const applyUsage = (
  features: FeatureUpsert[],
  usageById: ReadonlyMap<string, MetricDefinitionUsage>
): FeatureUpsert[] =>
  features.map((feature) => {
    const usage = usageById.get(feature.id);
    if (!usage) {
      return feature;
    }
    return { ...feature, properties: { ...feature.properties, usage } };
  });

const recordError = (errors: IdentifyMetricDefinitionsResult['errors'], error: unknown): void => {
  errors.push({ feature: METRIC_DEFINITION_FEATURE_TYPE, error: errorMessage(error) });
};

/**
 * Pages `METRICS_INFO` for one source, keeps metrics that have documents in the
 * window, and labels each survivor `detection` or `rca` when inference succeeds.
 */
export async function identifyMetricDefinitions({
  target,
  sourceId,
  indexPatterns = [target.samplingSource],
  start,
  end,
  esClient,
  kiClient,
  inferenceClient,
  logger,
  signal,
  pageSize: requestedPageSize,
}: IdentifyMetricDefinitionsOptions): Promise<IdentifyMetricDefinitionsResult> {
  const pageSize = pageSizeOf(requestedPageSize);
  const features: FeatureUpsert[] = [];
  const errors: IdentifyMetricDefinitionsResult['errors'] = [];

  const timeSeries = await hasTimeSeriesIndex(esClient, indexPatterns, logger);
  if (!timeSeries) {
    return { features, errors };
  }

  const expiresAt = kiClient.getDefaultExpiresAt();
  let cursor: PageCursor | undefined;
  let pages = 0;
  let catalogueRemains = true;

  while (catalogueRemains && pages < MAX_METRIC_DEFINITION_PAGES) {
    if (signal?.aborted) {
      catalogueRemains = false;
      break;
    }
    pages += 1;

    let rows: MetricsInfoRow[];
    try {
      const response = await runEsqlQuery(
        esClient,
        metricsInfoQuery(target.samplingSource, pageSize, cursor)
      );
      rows = response ? rowsFromResponse(response) : [];
    } catch (error) {
      recordError(errors, error);
      catalogueRemains = false;
      break;
    }

    if (rows.length === 0) {
      catalogueRemains = false;
      break;
    }

    const catalogue = rows.flatMap((row) => toMetricDefinitionFeatures(row));
    let liveIds: Set<string>;
    try {
      liveIds = await metricsWithDocuments({ esClient, features: catalogue, start, end });
    } catch (error) {
      recordError(errors, error);
      catalogueRemains = false;
      break;
    }

    const live = catalogue.filter((feature) => liveIds.has(feature.id));
    let usageById = new Map<string, MetricDefinitionUsage>();
    if (live.length > 0 && inferenceClient) {
      try {
        usageById = await classifyMetrics({ inferenceClient, features: live, signal });
      } catch (error) {
        recordError(errors, error);
      }
    }

    const labeled = applyUsage(live, usageById);
    if (labeled.length > 0) {
      try {
        await kiClient.bulk(
          sourceId,
          labeled.map((feature) => ({ index: { feature: { ...feature, expires_at: expiresAt } } }))
        );
        features.push(...labeled);
      } catch (error) {
        recordError(errors, error);
        catalogueRemains = false;
        break;
      }
    }

    if (rows.length < pageSize) {
      catalogueRemains = false;
      break;
    }

    const nextCursor = cursorFor(rows[rows.length - 1]);
    if (
      !nextCursor ||
      (cursor &&
        cursor.metricName === nextCursor.metricName &&
        cursor.dataStream === nextCursor.dataStream)
    ) {
      recordError(errors, new Error('Metric catalogue page did not advance'));
      catalogueRemains = false;
      break;
    }
    cursor = nextCursor;
  }

  if (catalogueRemains) {
    recordError(errors, new Error('Metric catalogue page limit reached'));
  }

  return { features, errors };
}
