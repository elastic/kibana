/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import { fetchQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/api';
import type { AlertEvidence, TimeRangePreset } from '../graph_state';
import type { AlertSeverity, RelationshipEntity } from './use_entity_relationships';

const ALERT_FIELDS = [
  'kibana.alert.rule.name',
  'kibana.alert.title',
  'kibana.alert.severity',
  'kibana.alert.workflow_status',
  '@timestamp',
  'event.kind',
  'event.category',
  'user.name',
  'host.name',
  'service.name',
  'source.ip',
  'destination.ip',
  'process.name',
  'process.executable',
] as const;

interface AlertEvidenceFields {
  'kibana.alert.rule.name'?: string[];
  'kibana.alert.title'?: string[];
  'kibana.alert.severity'?: string[];
  'kibana.alert.workflow_status'?: string[];
  '@timestamp'?: string[];
  'event.kind'?: string[];
  'event.category'?: string[];
  'user.name'?: string[];
  'host.name'?: string[];
  'service.name'?: string[];
  'source.ip'?: string[];
  'destination.ip'?: string[];
  'process.name'?: string[];
  'process.executable'?: string[];
}

export interface AlertEvidenceHit {
  _id: string;
  fields?: AlertEvidenceFields;
}

export interface AlertEvidenceQueryParams {
  entities: readonly RelationshipEntity[];
  timeRange: TimeRangePreset;
  severities: readonly AlertSeverity[];
  sizeLimit?: number;
  enabled?: boolean;
}

const isAlertSeverity = (value: string | undefined): value is AlertSeverity =>
  value === 'low' || value === 'medium' || value === 'high' || value === 'critical';

const entityFilter = (entity: RelationshipEntity): object =>
  entity.kind === 'ip'
    ? {
        bool: {
          should: [
            { term: { 'source.ip': entity.identifierValue } },
            { term: { 'destination.ip': entity.identifierValue } },
          ],
          minimum_should_match: 1,
        },
      }
    : {
        term: {
          [EntityTypeToIdentifierField[entity.kind]]: entity.identifierValue,
        },
      };

export const buildAlertEvidenceQuery = ({
  entities,
  timeRange,
  severities,
  sizeLimit = 12,
}: AlertEvidenceQueryParams): object => {
  const filters: object[] = [
    ...entities.map(entityFilter),
    { range: { '@timestamp': { gte: `now-${timeRange}`, lte: 'now' } } },
  ];
  if (severities.length > 0 && severities.length < 4) {
    filters.push({ terms: { 'kibana.alert.severity': severities } });
  }
  return {
    size: sizeLimit,
    _source: false,
    fields: ALERT_FIELDS,
    query: { bool: { filter: filters } },
    sort: [{ '@timestamp': { order: 'desc' } }],
  };
};

export const toAlertEvidence = (hit: AlertEvidenceHit): AlertEvidence => {
  const fields = hit.fields;
  const severity = fields?.['kibana.alert.severity']?.[0];
  return {
    id: hit._id,
    ruleName: fields?.['kibana.alert.rule.name']?.[0] ?? 'Detection alert',
    title: fields?.['kibana.alert.title']?.[0],
    severity: isAlertSeverity(severity) ? severity : undefined,
    status: fields?.['kibana.alert.workflow_status']?.[0],
    timestamp: fields?.['@timestamp']?.[0],
    eventKind: fields?.['event.kind']?.[0],
    eventCategory: fields?.['event.category'] ?? [],
    users: fields?.['user.name'] ?? [],
    hosts: fields?.['host.name'] ?? [],
    services: fields?.['service.name'] ?? [],
    sourceIps: fields?.['source.ip'] ?? [],
    destinationIps: fields?.['destination.ip'] ?? [],
    processName: fields?.['process.name']?.[0],
    processExecutable: fields?.['process.executable']?.[0],
  };
};

/**
 * Loads the actual detection alert documents supporting one entity or a
 * relationship pair. Multiple entity filters are ANDed, so edge evidence is
 * limited to alerts shared by both endpoints.
 */
export const useAlertEvidence = (params: AlertEvidenceQueryParams) => {
  const entityKey = params.entities
    .map(({ kind, identifierValue }) => `${kind}:${identifierValue}`)
    .sort()
    .join('|');
  const severityKey = [...params.severities].sort().join(',');
  const { data, isLoading, isError, refetch } = useQuery(
    [
      'entityIntelligenceAlertEvidence',
      entityKey,
      params.timeRange,
      severityKey,
      params.sizeLimit ?? 12,
    ],
    ({ signal }) =>
      fetchQueryAlerts<AlertEvidenceHit, never>({
        query: buildAlertEvidenceQuery(params),
        signal: signal ?? new AbortController().signal,
      }),
    {
      enabled: (params.enabled ?? true) && params.entities.length > 0,
      retry: 1,
      refetchOnWindowFocus: false,
      keepPreviousData: false,
    }
  );

  const alerts = useMemo(() => (data?.hits.hits ?? []).map(toAlertEvidence), [data?.hits.hits]);
  return {
    alerts,
    totalAlerts: data?.hits.total.value ?? 0,
    isLoading,
    isError,
    refetch,
  };
};
