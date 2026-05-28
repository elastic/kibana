/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface SourceEntities {
  hostNames: string[];
  userNames: string[];
  sourceIps: string[];
  destIps: string[];
}

export interface FindRelatedAlertsParams {
  alertId: string;
  alertsIndex: string;
  timeWindowHours: number;
  maxResults?: number;
  hostNames?: string[];
  userNames?: string[];
  sourceIps?: string[];
  destIps?: string[];
}

interface RelatedAlertDocument extends Record<string, unknown> {
  _id: string;
  _index: string;
}

export interface FindRelatedAlertsSuccess {
  ok: true;
  message: string;
  relatedAlerts: RelatedAlertDocument[];
  sourceEntities: SourceEntities;
  totalMatched: number;
  returnedCount: number;
  isTruncated: boolean;
}

export interface FindRelatedAlertsError {
  ok: false;
  message: string;
}

export type FindRelatedAlertsResult = FindRelatedAlertsSuccess | FindRelatedAlertsError;

/** Default for REST/API callers; inline tool passes a higher cap for fewer follow-up calls. */
export const RELATED_ALERTS_DEFAULT_MAX_RESULTS = 25;
/** Matches legacy inline-tool behavior and 15-rep eval token budget. */
export const RELATED_ALERTS_INLINE_MAX_RESULTS = 50;
const MAX_ENTITY_VALUES_PER_FIELD = 50;

const RELATED_ALERT_SOURCE_ALLOWLIST = [
  '@timestamp',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'kibana.alert.workflow_status',
  'kibana.alert.reason',
  'kibana.alert.rule.threat',
  'host.name',
  'user.name',
  'source.ip',
  'destination.ip',
  'process.name',
  'process.executable',
  'file.name',
  'file.path',
  'message',
] as const;

export const findRelatedAlerts = async (
  esClient: ElasticsearchClient,
  params: FindRelatedAlertsParams
): Promise<FindRelatedAlertsResult> => {
  const {
    alertId,
    alertsIndex,
    timeWindowHours,
    maxResults = RELATED_ALERTS_DEFAULT_MAX_RESULTS,
    hostNames: providedHostNames,
    userNames: providedUserNames,
    sourceIps: providedSourceIps,
    destIps: providedDestIps,
  } = params;

  const providedEntities: SourceEntities = {
    hostNames: trimEntityValues(providedHostNames),
    userNames: trimEntityValues(providedUserNames),
    sourceIps: trimEntityValues(providedSourceIps),
    destIps: trimEntityValues(providedDestIps),
  };

  const hasProvidedEntities = hasAnyEntityValues(providedEntities);

  try {
    let sourceEntities: SourceEntities;

    if (hasProvidedEntities) {
      const alertEntities = await getAlertSourceEntities(esClient, alertsIndex, alertId);
      sourceEntities = mergeSourceEntities(alertEntities, providedEntities);
    } else {
      const alertEntities = await getAlertSourceEntities(esClient, alertsIndex, alertId);
      if (!alertEntities) {
        return {
          ok: false,
          message: `Alert ${alertId} not found or has no source data.`,
        };
      }
      sourceEntities = alertEntities;
    }

    if (!hasAnyEntityValues(sourceEntities)) {
      return {
        ok: true,
        message: 'No entity values found on the source alert to correlate.',
        sourceEntities,
        relatedAlerts: [],
        totalMatched: 0,
        returnedCount: 0,
        isTruncated: false,
      };
    }

    const shouldClauses: Array<{ terms: Record<string, string[]> }> = [];
    if (sourceEntities.hostNames.length > 0) {
      shouldClauses.push({ terms: { 'host.name': sourceEntities.hostNames } });
    }
    if (sourceEntities.userNames.length > 0) {
      shouldClauses.push({ terms: { 'user.name': sourceEntities.userNames } });
    }
    if (sourceEntities.sourceIps.length > 0) {
      shouldClauses.push({ terms: { 'source.ip': sourceEntities.sourceIps } });
    }
    if (sourceEntities.destIps.length > 0) {
      shouldClauses.push({ terms: { 'destination.ip': sourceEntities.destIps } });
    }

    const size = Math.min(Math.max(maxResults, 1), 100);

    const searchResult = await esClient.search<Record<string, unknown>>({
      index: alertsIndex,
      size,
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  gte: `now-${timeWindowHours}h`,
                },
              },
            },
          ],
          should: shouldClauses,
          minimum_should_match: 1,
          must_not: [{ ids: { values: [alertId] } }],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
      _source: [...RELATED_ALERT_SOURCE_ALLOWLIST],
      ignore_unavailable: true,
    });

    const relatedAlerts: RelatedAlertDocument[] = searchResult.hits.hits.flatMap((hit) => {
      if (hit._id == null) {
        return [];
      }
      return [
        {
          _id: hit._id,
          _index: hit._index ?? alertsIndex,
          ...((hit._source as Record<string, unknown> | undefined) ?? {}),
        },
      ];
    });

    const totalMatched = getTotalMatched(searchResult.hits.total);
    const returnedCount = relatedAlerts.length;
    const isTruncated = totalMatched > returnedCount;

    return {
      ok: true,
      message: buildSuccessMessage({ alertId, returnedCount, totalMatched, isTruncated }),
      sourceEntities,
      relatedAlerts,
      totalMatched,
      returnedCount,
      isTruncated,
    };
  } catch (error) {
    return {
      ok: false,
      message: `Failed to find related alerts: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
};

const getTotalMatched = (
  total: number | { relation?: string; value?: number } | undefined
): number => {
  if (typeof total === 'number') {
    return total;
  }
  if (total && typeof total.value === 'number') {
    return total.value;
  }
  return 0;
};

const buildSuccessMessage = ({
  alertId,
  returnedCount,
  totalMatched,
  isTruncated,
}: {
  alertId: string;
  returnedCount: number;
  totalMatched: number;
  isTruncated: boolean;
}): string => {
  if (isTruncated) {
    return `Found ${returnedCount} of ${totalMatched} related alerts sharing entities with alert ${alertId}.`;
  }
  return `Found ${returnedCount} related alerts sharing entities with alert ${alertId}.`;
};

const hasAnyEntityValues = (entities: SourceEntities): boolean =>
  entities.hostNames.length > 0 ||
  entities.userNames.length > 0 ||
  entities.sourceIps.length > 0 ||
  entities.destIps.length > 0;

const mergeSourceEntities = (
  alertEntities: SourceEntities | null,
  providedEntities: SourceEntities
): SourceEntities => ({
  hostNames: unionEntityValues(alertEntities?.hostNames, providedEntities.hostNames),
  userNames: unionEntityValues(alertEntities?.userNames, providedEntities.userNames),
  sourceIps: unionEntityValues(alertEntities?.sourceIps, providedEntities.sourceIps),
  destIps: unionEntityValues(alertEntities?.destIps, providedEntities.destIps),
});

const unionEntityValues = (...valueLists: Array<string[] | undefined>): string[] =>
  trimEntityValues(valueLists.flatMap((values) => values ?? []));

const getAlertSourceEntities = async (
  esClient: ElasticsearchClient,
  alertsIndex: string,
  alertId: string
): Promise<SourceEntities | null> => {
  try {
    const alertResult = await esClient.get({
      index: alertsIndex,
      id: alertId,
    });

    const alertSource = alertResult._source as Record<string, unknown> | undefined;
    if (!alertSource) {
      return null;
    }

    return extractSourceEntitiesFromAlert(alertSource);
  } catch {
    return null;
  }
};

const extractSourceEntitiesFromAlert = (alertSource: Record<string, unknown>): SourceEntities => ({
  hostNames: trimEntityValues(getNestedValues(alertSource, 'host.name')),
  userNames: trimEntityValues(getNestedValues(alertSource, 'user.name')),
  sourceIps: trimEntityValues(getNestedValues(alertSource, 'source.ip')),
  destIps: trimEntityValues(getNestedValues(alertSource, 'destination.ip')),
});

function trimEntityValues(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const uniqueValues = [
    ...new Set(
      values.filter((value): value is string => typeof value === 'string' && value.length > 0)
    ),
  ];
  return uniqueValues.slice(0, MAX_ENTITY_VALUES_PER_FIELD);
}

function getNestedValues(obj: Record<string, unknown>, path: string): string[] {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      current = undefined;
      break;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (current !== undefined) {
    return normalizeToStringArray(current);
  }

  const flatValue = obj[path];
  if (flatValue !== undefined) {
    return normalizeToStringArray(flatValue);
  }

  return [];
}

function normalizeToStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}
