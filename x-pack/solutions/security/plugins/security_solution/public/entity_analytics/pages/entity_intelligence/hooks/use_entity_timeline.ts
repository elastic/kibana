/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import {
  EntityType,
  EntityTypeToIdentifierField,
} from '../../../../../common/entity_analytics/types';
import { fetchQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/api';
import { useKibana } from '../../../../common/lib/kibana';
import type { ActivityKind } from '../event_context';
import type { IntelligenceEntity } from '../common';
import type { TimeRangePreset } from '../graph_state';
import type {
  BuildTimelineOptions,
  TimelineAlertInput,
  TimelineEventInput,
  TimelineModel,
} from '../timeline_model';
import { buildTimelineModel } from '../timeline_model';
import type { AlertSeverity } from './use_entity_relationships';

/** Index pattern for the raw ECS events that back the causal timeline. */
export const TIMELINE_EVENT_INDEX = 'logs-*';

/** Bounded fetch sizes so the timeline request stays cheap regardless of volume. */
const ALERT_FETCH_SIZE = 40;
const EVENT_FETCH_SIZE = 200;

const ALERT_FIELDS = [
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'kibana.alert.rule.threat.tactic.name',
  '@timestamp',
  'user.name',
  'host.name',
  'process.name',
] as const;

const EVENT_FIELDS = [
  '@timestamp',
  'event.category',
  'event.action',
  'user.name',
  'host.name',
  'process.name',
  'process.parent.name',
  'destination.ip',
  'destination.port',
  'destination.domain',
  'source.ip',
  'file.path',
  'network.direction',
] as const;

const isAlertSeverity = (value: string | undefined): value is AlertSeverity =>
  value === 'low' || value === 'medium' || value === 'high' || value === 'critical';

const isActivityKind = (value: string | undefined): value is ActivityKind =>
  value === 'network' || value === 'authentication' || value === 'process' || value === 'file';

interface AlertFields {
  'kibana.alert.rule.name'?: string[];
  'kibana.alert.severity'?: string[];
  'kibana.alert.risk_score'?: number[];
  'kibana.alert.rule.threat.tactic.name'?: string[];
  '@timestamp'?: string[];
  'user.name'?: string[];
  'host.name'?: string[];
  'process.name'?: string[];
}

interface EventFields {
  '@timestamp'?: string[];
  'event.category'?: string[];
  'event.action'?: string[];
  'user.name'?: string[];
  'host.name'?: string[];
  'process.name'?: string[];
  'process.parent.name'?: string[];
  'destination.ip'?: string[];
  'destination.port'?: Array<number | string>;
  'destination.domain'?: string[];
  'source.ip'?: string[];
  'file.path'?: string[];
  'network.direction'?: string[];
}

interface AlertHit {
  _id: string;
  _index: string;
  fields?: AlertFields;
}

interface EventHit {
  _id: string;
  _index: string;
  fields?: EventFields;
}

const toEpochMs = (iso: string | undefined): number | undefined => {
  if (!iso) return undefined;
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : undefined;
};

/** Filter matching the focus entity by its raw identifier value. */
const entityFilter = (entity: IntelligenceEntity): object => {
  if (entity.type === EntityType.host) {
    return {
      bool: {
        should: [
          { term: { 'host.name': entity.identifierValue } },
          { term: { 'host.target.name': entity.identifierValue } },
          { term: { 'destination.domain': entity.identifierValue } },
        ],
        minimum_should_match: 1,
      },
    };
  }
  return { term: { [EntityTypeToIdentifierField[entity.type]]: entity.identifierValue } };
};

export const buildTimelineAlertsQuery = (
  entity: IntelligenceEntity,
  timeRange: TimeRangePreset
): object => ({
  size: ALERT_FETCH_SIZE,
  _source: false,
  fields: ALERT_FIELDS,
  query: {
    bool: {
      filter: [
        entityFilter(entity),
        { range: { '@timestamp': { gte: `now-${timeRange}`, lte: 'now' } } },
      ],
    },
  },
  sort: [{ '@timestamp': { order: 'asc' } }],
});

export const buildTimelineEventsQuery = (
  entity: IntelligenceEntity,
  timeRange: TimeRangePreset
): Record<string, unknown> => ({
  size: EVENT_FETCH_SIZE,
  _source: false,
  fields: EVENT_FIELDS,
  query: {
    bool: {
      filter: [
        entityFilter(entity),
        { range: { '@timestamp': { gte: `now-${timeRange}`, lte: 'now' } } },
        { term: { 'event.kind': 'event' } },
      ],
    },
  },
  sort: [{ '@timestamp': { order: 'asc' } }],
});

export const toTimelineAlertInput = (hit: AlertHit): TimelineAlertInput | undefined => {
  const fields = hit.fields;
  const timestamp = toEpochMs(fields?.['@timestamp']?.[0]);
  if (timestamp === undefined) return undefined;
  const severity = fields?.['kibana.alert.severity']?.[0];
  return {
    id: hit._id,
    index: hit._index,
    ruleName: fields?.['kibana.alert.rule.name']?.[0] ?? 'Detection alert',
    severity: isAlertSeverity(severity) ? severity : undefined,
    timestamp,
    host: fields?.['host.name']?.[0],
    user: fields?.['user.name']?.[0],
    tacticName: fields?.['kibana.alert.rule.threat.tactic.name']?.[0],
    riskScore: fields?.['kibana.alert.risk_score']?.[0],
    processName: fields?.['process.name']?.[0],
  };
};

export const toTimelineEventInput = (hit: EventHit): TimelineEventInput | undefined => {
  const fields = hit.fields;
  const timestamp = toEpochMs(fields?.['@timestamp']?.[0]);
  const category = fields?.['event.category']?.find(isActivityKind);
  if (timestamp === undefined || category === undefined) return undefined;
  const rawPort = fields?.['destination.port']?.[0];
  const port = rawPort === undefined ? undefined : Number(rawPort);
  return {
    id: hit._id,
    index: hit._index,
    category,
    action: fields?.['event.action']?.[0],
    timestamp,
    host: fields?.['host.name']?.[0],
    user: fields?.['user.name']?.[0],
    processName: fields?.['process.name']?.[0],
    parentProcessName: fields?.['process.parent.name']?.[0],
    destinationIp: fields?.['destination.ip']?.[0],
    destinationPort: port !== undefined && Number.isFinite(port) ? port : undefined,
    destinationDomain: fields?.['destination.domain']?.[0],
    sourceIp: fields?.['source.ip']?.[0],
    filePath: fields?.['file.path']?.[0],
    networkDirection: fields?.['network.direction']?.[0],
  };
};

export interface UseEntityTimelineParams {
  entity: IntelligenceEntity | undefined;
  timeRange: TimeRangePreset;
  options?: BuildTimelineOptions;
  enabled?: boolean;
}

export interface UseEntityTimelineResult {
  model: TimelineModel;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const EMPTY_MODEL: TimelineModel = { steps: [], overflowCount: 0, totalSignificant: 0 };

interface RawDocRef {
  id: string;
  index: string | undefined;
}

/**
 * Fetches the raw `_source` of a single timeline step's underlying document by
 * id + index, for the "view raw log" surface. Uses the same `data.search`
 * plumbing as the rest of the timeline; resolves to `undefined` (never throws)
 * so the raw view degrades to "unavailable" instead of breaking the panel.
 */
export const useEntityRawDocument = (ref: RawDocRef | undefined) => {
  const search = useKibana().services.data.search.search;
  const { data, isLoading, isError } = useQuery(
    ['entityIntelligenceTimelineRawDoc', ref?.index, ref?.id],
    async ({ signal }) => {
      if (!ref || !ref.index) return undefined;
      try {
        const response = await lastValueFrom(
          search<
            { params: Record<string, unknown> },
            IKibanaSearchResponse<{ hits?: { hits?: Array<{ _source?: unknown }> } }>
          >(
            {
              params: {
                index: ref.index,
                allow_no_indices: true,
                ignore_unavailable: true,
                size: 1,
                query: { ids: { values: [ref.id] } },
              },
            },
            { abortSignal: signal ?? undefined }
          )
        );
        return response.rawResponse?.hits?.hits?.[0]?._source ?? undefined;
      } catch {
        return undefined;
      }
    },
    { enabled: !!ref && !!ref.index, retry: 0, refetchOnWindowFocus: false }
  );
  return { source: data, isLoading, isError };
};

/**
 * Loads the focus entity's detection alerts and its significant raw `logs-*`
 * events over the selected window, then folds them into a causal waterfall via
 * {@link buildTimelineModel}. The alert fetch and event fetch are independent
 * so a missing `logs-*` index (or RBAC failure) still yields the alert-only
 * timeline; both resolve to empty on error, keeping the view resilient.
 */
export const useEntityTimeline = ({
  entity,
  timeRange,
  options,
  enabled = true,
}: UseEntityTimelineParams): UseEntityTimelineResult => {
  const search = useKibana().services.data.search.search;
  const isQueryable = enabled && !!entity && entity.type !== EntityType.generic;

  const {
    data: alerts,
    isLoading: isAlertsLoading,
    isError: isAlertsError,
    refetch: refetchAlerts,
  } = useQuery(
    ['entityIntelligenceTimelineAlerts', entity?.type, entity?.identifierValue, timeRange],
    async ({ signal }) => {
      if (!entity) return [] as TimelineAlertInput[];
      const response = await fetchQueryAlerts<AlertHit, never>({
        query: buildTimelineAlertsQuery(entity, timeRange),
        signal: signal ?? new AbortController().signal,
      });
      return (response.hits.hits ?? [])
        .map(toTimelineAlertInput)
        .filter((value): value is TimelineAlertInput => value !== undefined);
    },
    { enabled: isQueryable, retry: 1, refetchOnWindowFocus: false, keepPreviousData: false }
  );

  const {
    data: events,
    isLoading: isEventsLoading,
    refetch: refetchEvents,
  } = useQuery(
    ['entityIntelligenceTimelineEvents', entity?.type, entity?.identifierValue, timeRange],
    async ({ signal }) => {
      if (!entity) return [] as TimelineEventInput[];
      try {
        const response = await lastValueFrom(
          search<
            { params: Record<string, unknown> },
            IKibanaSearchResponse<{ hits?: { hits?: EventHit[] } }>
          >(
            {
              params: {
                index: TIMELINE_EVENT_INDEX,
                allow_no_indices: true,
                ignore_unavailable: true,
                ...buildTimelineEventsQuery(entity, timeRange),
              },
            },
            { abortSignal: signal ?? undefined }
          )
        );
        return (response.rawResponse?.hits?.hits ?? [])
          .map(toTimelineEventInput)
          .filter((value): value is TimelineEventInput => value !== undefined);
      } catch {
        return [] as TimelineEventInput[];
      }
    },
    { enabled: isQueryable, retry: 0, refetchOnWindowFocus: false, keepPreviousData: false }
  );

  const model = useMemo(
    () => buildTimelineModel(alerts ?? [], events ?? [], options),
    [alerts, events, options]
  );

  return {
    model: isQueryable ? model : EMPTY_MODEL,
    isLoading: isAlertsLoading || isEventsLoading,
    isError: isAlertsError,
    refetch: () => {
      refetchAlerts();
      refetchEvents();
    },
  };
};
