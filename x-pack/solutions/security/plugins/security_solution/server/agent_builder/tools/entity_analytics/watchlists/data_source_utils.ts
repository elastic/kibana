/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type {
  DateRange,
  MonitoringEntitySource,
} from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { RuleBasedSourceType } from '../../../../lib/entity_analytics/watchlists/entity_sources/infra';

const STORE_PREVIEW_SAMPLE_SIZE = 5;

const getTotalHits = (total: estypes.SearchHitsMetadata['total']): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

/**
 * Runs the `store`-type entity source's `queryRule` against the entity store, exactly as the
 * sync job will, to catch typo / zero-match queries before they're saved silently.
 */
export const previewStoreSource = async ({
  esClient,
  namespace,
  queryRule,
}: {
  esClient: ElasticsearchClient;
  namespace: string;
  queryRule: string;
}) => {
  const response = await esClient.search<{ entity?: { id?: string } }>({
    index: getEntitiesAlias(ENTITY_LATEST, namespace),
    size: STORE_PREVIEW_SAMPLE_SIZE,
    track_total_hits: true,
    query: toElasticsearchQuery(fromKueryExpression(queryRule)),
    _source: ['entity.id'],
  });

  return {
    total: getTotalHits(response.hits.total),
  };
};

export const formatStorePreviewMessage = (total: number): string => {
  if (total === 0) {
    return 'This query currently matches **0 entities** in the entity store. It will still be saved, but no entities will be added until the query matches something — double-check the field name and value.';
  }
  const noun = total === 1 ? 'entity' : 'entities';
  return `Matches **${total} ${noun}** right now. It will be re-evaluated automatically as entities start or stop matching.`;
};

interface IndexSourcePreview {
  docCount: number;
  distinctIdentifierCount: number;
}

/**
 * Runs stage 2 of the `index`-type sync (queryRule + range against the target index) without the
 * `terms` correlation filter, since that requires an entity-store scan the preview doesn't need.
 * Reports a **document** count, not a membership count — a truthful membership count would
 * require the full two-stage correlation.
 */
export const previewIndexSource = async ({
  esClient,
  indexPattern,
  identifierField,
  queryRule,
  range,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
  identifierField: string;
  queryRule: string;
  range: DateRange;
}): Promise<IndexSourcePreview> => {
  const response = await esClient.search({
    index: indexPattern,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        must: [
          { range: { '@timestamp': { gte: range.start, lte: range.end } } },
          toElasticsearchQuery(fromKueryExpression(queryRule)),
        ],
      },
    },
    aggs: {
      identifiers: { cardinality: { field: identifierField } },
    },
  });

  const identifiersAgg = response.aggregations?.identifiers as
    | estypes.AggregationsCardinalityAggregate
    | undefined;

  return {
    docCount: getTotalHits(response.hits.total),
    distinctIdentifierCount: identifiersAgg?.value ?? 0,
  };
};

export const formatIndexPreviewMessage = (
  { docCount, distinctIdentifierCount }: IndexSourcePreview,
  { identifierField, range }: { identifierField: string; range: DateRange }
): string => {
  if (docCount === 0) {
    return `This query currently matches **0 documents** between \`${range.start}\` and \`${range.end}\`. It will still be saved, but no entities will be added until it matches something — double-check the index pattern and query.`;
  }
  const noun = distinctIdentifierCount === 1 ? 'value' : 'values';
  return `Your query matches **${docCount} documents** from **${distinctIdentifierCount} distinct \`${identifierField}\`** ${noun} between \`${range.start}\` and \`${range.end}\`. Those that exist in the entity store will be added — this is a document count, not a membership count.`;
};

interface RuleBasedSourceParams {
  queryRule: string;
  indexPattern?: string;
  identifierField?: string;
  range?: DateRange;
}

const formatRange = (range: DateRange | undefined): string | undefined =>
  range ? `${range.start} to ${range.end}` : undefined;

/**
 * Builds the confirmation-prompt lines describing a rule-based data source's parameters
 */
export const formatRuleBasedSourceParamLines = (
  type: RuleBasedSourceType,
  source: RuleBasedSourceParams,
  existing?: Partial<RuleBasedSourceParams>
): string[] => {
  const isUpdate = existing !== undefined;
  const formatParam = (label: string, currentValue: string | undefined, newValue: string) =>
    isUpdate
      ? `**${label}:** \`${currentValue ?? '(none)'}\` → \`${newValue}\``
      : `**${label}:** \`${newValue}\``;

  if (type === 'store') {
    return [formatParam('Filter query', existing?.queryRule, source.queryRule)];
  }

  return [
    formatParam('Index pattern', existing?.indexPattern, source.indexPattern ?? ''),
    formatParam('Identifier field', existing?.identifierField, source.identifierField ?? ''),
    formatParam('Lookback range', formatRange(existing?.range), formatRange(source.range) ?? ''),
    formatParam('Filter query', existing?.queryRule, source.queryRule),
  ];
};

export const toDataSourceSummary = (source: MonitoringEntitySource) => ({
  id: source.id,
  type: source.type,
  name: source.name,
  managed: source.managed ?? false,
  enabled: source.enabled ?? true,
  queryRule: source.queryRule,
  ...(source.type === RuleBasedSourceType.index
    ? {
        indexPattern: source.indexPattern,
        identifierField: source.identifierField,
        range: source.range,
        hasApiKey: !!source.apiKeyId,
      }
    : {}),
  ...(source.type === 'entity_analytics_integration'
    ? {
        integrationName: source.integrationName,
        indexPattern: source.indexPattern,
      }
    : {}),
});

export const fingerprintDataSource = (source: MonitoringEntitySource | undefined): string => {
  if (!source) {
    return 'none';
  }
  return JSON.stringify([
    source.id,
    source.type,
    source.name,
    source.queryRule ?? null,
    source.indexPattern ?? null,
    source.identifierField ?? null,
    source.range?.start ?? null,
    source.range?.end ?? null,
    source.enabled ?? true,
  ]);
};

export interface ConfirmedDataSourceState {
  existingSourceFingerprint: string;
  conflictingSourceId?: string | null;
}

export const DATA_SOURCE_CHANGED_MESSAGE =
  'The rule-based data source changed after the confirmation was shown, so the approved change was not applied. Re-run the request to see the current configuration and confirm again.';
