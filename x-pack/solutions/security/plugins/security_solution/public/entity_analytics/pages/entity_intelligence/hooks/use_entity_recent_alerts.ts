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
import type { IntelligenceEntity } from '../common';
import type { AlertSeverity } from './use_entity_relationships';

const RECENT_ALERTS_SIZE = 5;

export interface RecentAlertsQueryParams {
  timeRange?: '24h' | '7d' | '30d' | '90d';
  severities?: readonly AlertSeverity[];
  sizeLimit?: number;
}

export interface RecentAlert {
  id: string;
  ruleName: string;
  severity: AlertSeverity | undefined;
  timestamp: string | undefined;
  workflowStatus: string | undefined;
}

interface RecentAlertFields {
  'kibana.alert.rule.name'?: string[];
  'kibana.alert.severity'?: string[];
  'kibana.alert.workflow_status'?: string[];
  '@timestamp'?: string[];
}

interface RecentAlertHit {
  _id: string;
  fields?: RecentAlertFields;
}

const isAlertSeverity = (value: string | undefined): value is AlertSeverity =>
  value === 'low' || value === 'medium' || value === 'high' || value === 'critical';

const buildRecentAlertsQuery = (
  identifierField: string,
  entityName: string,
  params: RecentAlertsQueryParams
): object => {
  const filters: object[] = [
    { term: { [identifierField]: entityName } },
    { range: { '@timestamp': { gte: `now-${params.timeRange ?? '90d'}`, lte: 'now' } } },
  ];
  if (params.severities && params.severities.length > 0 && params.severities.length < 4) {
    filters.push({ terms: { 'kibana.alert.severity': params.severities } });
  }
  return {
    size: params.sizeLimit ?? RECENT_ALERTS_SIZE,
    _source: false,
    fields: [
      'kibana.alert.rule.name',
      'kibana.alert.severity',
      'kibana.alert.workflow_status',
      '@timestamp',
    ],
    query: {
      bool: { filter: filters },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  };
};

/**
 * Fetches the latest detection alerts naming the entity (top 5, last 90 days)
 * through the detection engine signals search API.
 */
export const useEntityRecentAlerts = (
  entity: IntelligenceEntity | undefined,
  params: RecentAlertsQueryParams = {}
) => {
  const identifierField = entity ? EntityTypeToIdentifierField[entity.type] : undefined;
  const severityKey = [...(params.severities ?? [])].sort().join(',');

  const { data, isLoading, isError } = useQuery(
    [
      'entityIntelligenceRecentAlerts',
      entity?.type,
      entity?.identifierValue,
      params.timeRange ?? '90d',
      severityKey,
      params.sizeLimit ?? RECENT_ALERTS_SIZE,
    ],
    async ({ signal }) => {
      if (!entity || !identifierField) {
        return undefined;
      }
      return fetchQueryAlerts<RecentAlertHit, never>({
        query: buildRecentAlertsQuery(identifierField, entity.identifierValue, params),
        signal: signal ?? new AbortController().signal,
      });
    },
    {
      enabled: !!entity && !!identifierField,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const alerts = useMemo<RecentAlert[]>(
    () =>
      (data?.hits.hits ?? []).map((hit) => {
        const severity = hit.fields?.['kibana.alert.severity']?.[0];
        return {
          id: hit._id,
          ruleName: hit.fields?.['kibana.alert.rule.name']?.[0] ?? '—',
          severity: isAlertSeverity(severity) ? severity : undefined,
          timestamp: hit.fields?.['@timestamp']?.[0],
          workflowStatus: hit.fields?.['kibana.alert.workflow_status']?.[0],
        };
      }),
    [data?.hits.hits]
  );

  return { alerts, totalAlerts: data?.hits.total.value ?? 0, isLoading, isError };
};
