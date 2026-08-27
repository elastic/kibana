/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ALERT_BUILDING_BLOCK_TYPE } from '@kbn/rule-data-utils';

import { ALERTS_QUERY_NAMES } from '../../detections/containers/detection_engine/alerts/constants';
import { useQueryAlerts } from '../../detections/containers/detection_engine/alerts/use_query';

/**
 * Fields the detail page needs from each alert, kept small so the response stays light.
 * `agent.type`, `event.module` and `event.dataset` are here for `useIsAnalyzerEnabled`, which reads
 * all three to decide whether an alert has a process tree.
 */
const ALERT_FIELDS = [
  '@timestamp',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.uuid',
  'event.code',
  'event.dataset',
  'event.module',
  'agent.id',
  'agent.type',
  'host.name',
  'process.entity_id',
  'process.name',
  'file.hash.sha256',
  'file.name',
];

const MAX_ALERTS = 100;

export interface DetonationAlert {
  _id: string;
  _index: string;
  /** `kibana.alert.uuid`, the id a pivot to the Alerts page can filter on. */
  alertId: string | null;
  timestamp: string | null;
  ruleName: string | null;
  severity: string | null;
  eventCode: string | null;
  processName: string | null;
  processEntityId: string | null;
  agentId: string | null;
  agentType: string | null;
  hostName: string | null;
  /** Raw fields response, needed to open the analyzer with a real document. */
  fields: Record<string, unknown[]>;
}

/** Shapes an alert as the document the shared analyzer hooks expect. */
export const toAnalyzerRecord = (alert: DetonationAlert): DataTableRecord => ({
  id: alert._id,
  raw: { _id: alert._id, _index: alert._index, fields: alert.fields },
  flattened: alert.fields,
});

const firstValue = (fields: Record<string, unknown[]>, key: string): string | null => {
  const value = fields[key]?.[0];
  return typeof value === 'string' ? value : null;
};

/**
 * Alerts produced by a single detonation, fetched through the detection engine search API so that
 * alert RBAC is applied. The VM is single-use, so `agent.id` identifies the detonation exactly.
 *
 * Building block alerts are left out, matching the Alerts page default. They are the low-signal
 * feed for other rules rather than detections worth showing, and a row here links to the Alerts
 * page, which would not show them.
 */
export const useDetonationAlerts = ({
  agentId,
  skip,
}: {
  agentId: string | null;
  skip?: boolean;
}) => {
  const { loading, data, setQuery } = useQueryAlerts<
    { _id: string; _index: string; fields: Record<string, unknown[]> },
    undefined
  >({
    query: {},
    queryName: ALERTS_QUERY_NAMES.DETONATION_ALERTS,
    skip: skip || !agentId,
  });

  // `useQueryAlerts` seeds its query once and refetches only through `setQuery`, so the agent id
  // has to be pushed in when the detonation resolves rather than passed as the initial query.
  useEffect(() => {
    if (!agentId) {
      return;
    }

    setQuery({
      query: {
        bool: {
          filter: [{ term: { 'agent.id': agentId } }],
          must_not: [{ exists: { field: ALERT_BUILDING_BLOCK_TYPE } }],
        },
      },
      fields: ALERT_FIELDS,
      _source: false,
      size: MAX_ALERTS,
      sort: [{ '@timestamp': { order: 'desc' as const } }],
    });
  }, [agentId, setQuery]);

  const alerts = useMemo<DetonationAlert[]>(() => {
    const hits = data?.hits?.hits ?? [];
    return hits.map((hit) => {
      const fields = hit.fields ?? {};
      return {
        _id: hit._id,
        _index: hit._index,
        alertId: firstValue(fields, 'kibana.alert.uuid'),
        timestamp: firstValue(fields, '@timestamp'),
        ruleName: firstValue(fields, 'kibana.alert.rule.name'),
        severity: firstValue(fields, 'kibana.alert.severity'),
        eventCode: firstValue(fields, 'event.code'),
        processName: firstValue(fields, 'process.name'),
        processEntityId: firstValue(fields, 'process.entity_id'),
        agentId: firstValue(fields, 'agent.id'),
        agentType: firstValue(fields, 'agent.type'),
        hostName: firstValue(fields, 'host.name'),
        fields,
      };
    });
  }, [data]);

  // Between the agent id arriving and the fetch starting the hook reports neither loading nor data,
  // which would flash the "no alerts" empty state on a detonation that has some.
  const isLoading = loading || (Boolean(agentId) && !skip && data === null);

  return { alerts, isLoading };
};
