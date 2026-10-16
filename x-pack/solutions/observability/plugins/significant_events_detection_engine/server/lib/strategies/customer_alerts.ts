/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUCKET_MS } from '../../../common';
import type { StrategyObservation } from '../domain';
import { esqlString } from '../esql';
import type { IDetectionStrategy, StrategyContext } from './types';

const ALERTS_INDEX_PATTERN = '.alerts-*';
/** Most active alerts read per run, newest first; a storm beyond this is not more informative. */
const MAX_ALERTS = 500;
const ALERTS_QUERY_TIMEOUT_MS = 30_000;

const IMPORTANCE_BY_SEVERITY: Record<string, number> = {
  critical: 90,
  high: 75,
  medium: 55,
  low: 35,
};
const DEFAULT_IMPORTANCE = 65;

/** Classic alerts store dotted keys flat or nested, depending on the rule type. */
function read(source: Record<string, unknown>, path: string): unknown {
  if (path in source) {
    return source[path];
  }
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      source
    );
}

function readString(source: Record<string, unknown>, path: string): string | undefined {
  const value = read(source, path);
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : undefined;
  }
  return value === undefined || value === null ? undefined : String(value);
}

function serviceOf(raw: Record<string, unknown>, ruleName: string): string {
  const serviceName = readString(raw, 'service.name');
  if (serviceName) {
    return serviceName;
  }
  const tags = read(raw, 'kibana.alert.rule.tags');
  const tag = Array.isArray(tags)
    ? tags.map(String).find((ruleTag) => ruleTag.startsWith('service:'))
    : undefined;
  return tag ? tag.slice('service:'.length) : ruleName;
}

async function readActiveAlerts(context: StrategyContext): Promise<StrategyObservation[]> {
  // Active alerts describe now, so they are reported once, in the latest settled bucket.
  const bucketStart = context.to - BUCKET_MS;
  const response = await context.userEsClient.search<Record<string, unknown>>(
    {
      index: ALERTS_INDEX_PATTERN,
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: ['open', 'hidden'],
      size: MAX_ALERTS,
      query: {
        bool: {
          filter: [
            { term: { 'kibana.alert.status': 'active' } },
            { term: { 'kibana.space_ids': context.spaceId } },
            { range: { 'kibana.alert.start': { lt: new Date(context.to).toISOString() } } },
          ],
        },
      },
      sort: [{ 'kibana.alert.start': { order: 'desc', unmapped_type: 'date' } }],
    },
    { signal: context.signal, requestTimeout: ALERTS_QUERY_TIMEOUT_MS }
  );

  return response.hits.hits.flatMap((hit): StrategyObservation[] => {
    const raw = hit._source ?? {};
    const ruleUuid = readString(raw, 'kibana.alert.rule.uuid');
    if (!ruleUuid) {
      return [];
    }
    const ruleName = readString(raw, 'kibana.alert.rule.name') ?? ruleUuid;
    const severity = readString(raw, 'kibana.alert.severity');
    return [
      {
        fingerprint: `alert:${ruleUuid}:${
          readString(raw, 'kibana.alert.instance.id') ?? 'default'
        }`,
        service: serviceOf(raw, ruleName),
        bucket_start: bucketStart,
        value: 1,
        unit: 'alert',
        looks_off: true,
        title: `Customer alert: ${ruleName}`,
        description: readString(raw, 'kibana.alert.reason') ?? `The rule "${ruleName}" is firing.`,
        importance: (severity ? IMPORTANCE_BY_SEVERITY[severity] : undefined) ?? DEFAULT_IMPORTANCE,
        evidence_esql: `FROM ${hit._index}
| WHERE kibana.alert.rule.uuid == ${esqlString(ruleUuid)}
| KEEP @timestamp, kibana.alert.status, kibana.alert.reason, kibana.alert.start
| SORT @timestamp DESC
| LIMIT 5`,
        since: readString(raw, 'kibana.alert.start'),
      },
    ];
  });
}

/**
 * Customer alerts: the customer's own rules, as detections. Most customer rules are classic
 * rules whose alerts never reach Alerting v2's event store, so the engine reads the alert
 * indices itself, as the user. It never changes how those alerts are delivered, and their rules
 * already decided, so the baseline check is skipped.
 */
export const customerAlertsStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'customer_alerts',
    name: 'Customer alerts',
    watches: "The customer's own active Kibana alerts in this space (.alerts-*)",
    reportsWhen: 'An alert is active; it recovers when the alert stops being active',
    baselinePolicy: 'skip',
    runner: 'direct',
    reportsOnlyFiring: true,
    supportsReplay: false,
    settleMs: 0,
  },

  async evaluate(context) {
    return { observations: await readActiveAlerts(context), notes: [] };
  },
};
