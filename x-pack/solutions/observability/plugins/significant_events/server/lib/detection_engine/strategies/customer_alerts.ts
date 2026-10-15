/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlString } from '../esql_helpers';
import type { IDetectionStrategy, StrategyContext, StrategyObservation } from './types';

const ALERTS_INDEX_PATTERN = '.alerts-*';
const MAX_ALERTS = 200;

const IMPORTANCE_BY_SEVERITY: Record<string, number> = {
  critical: 90,
  high: 75,
  medium: 55,
  low: 35,
};
const DEFAULT_IMPORTANCE = 65;

interface ClassicAlertSource {
  '@timestamp'?: string;
  'kibana.alert.uuid'?: string;
  'kibana.alert.instance.id'?: string;
  'kibana.alert.rule.uuid'?: string;
  'kibana.alert.rule.name'?: string;
  'kibana.alert.rule.tags'?: string[];
  'kibana.alert.reason'?: string;
  'kibana.alert.severity'?: string;
  'kibana.alert.start'?: string;
  'service.name'?: string | string[];
}

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

function serviceOf(alert: ClassicAlertSource, ruleName: string): string {
  const serviceName = alert['service.name'];
  if (serviceName) {
    return Array.isArray(serviceName) ? serviceName[0] : serviceName;
  }
  const tag = alert['kibana.alert.rule.tags']?.find((ruleTag) => ruleTag.startsWith('service:'));
  return tag ? tag.slice('service:'.length) : ruleName;
}

async function readClassicAlerts(context: StrategyContext): Promise<StrategyObservation[]> {
  const response = await context.esClient.search<Record<string, unknown>>({
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
  });

  return response.hits.hits.flatMap((hit): StrategyObservation[] => {
    const raw = hit._source ?? {};
    const alert: ClassicAlertSource = {
      'kibana.alert.uuid': read(raw, 'kibana.alert.uuid') as string | undefined,
      'kibana.alert.instance.id': read(raw, 'kibana.alert.instance.id') as string | undefined,
      'kibana.alert.rule.uuid': read(raw, 'kibana.alert.rule.uuid') as string | undefined,
      'kibana.alert.rule.name': read(raw, 'kibana.alert.rule.name') as string | undefined,
      'kibana.alert.rule.tags': read(raw, 'kibana.alert.rule.tags') as string[] | undefined,
      'kibana.alert.reason': read(raw, 'kibana.alert.reason') as string | undefined,
      'kibana.alert.severity': read(raw, 'kibana.alert.severity') as string | undefined,
      'kibana.alert.start': read(raw, 'kibana.alert.start') as string | undefined,
      'service.name': read(raw, 'service.name') as string | string[] | undefined,
    };
    const ruleUuid = alert['kibana.alert.rule.uuid'];
    if (!ruleUuid) {
      return [];
    }
    const ruleName = alert['kibana.alert.rule.name'] ?? ruleUuid;
    const severity = alert['kibana.alert.severity'];
    return [
      {
        fingerprint: `alert:${ruleUuid}:${alert['kibana.alert.instance.id'] ?? 'default'}`,
        service: serviceOf(alert, ruleName),
        bucket_start: context.from,
        value: 1,
        unit: 'alert',
        looks_off: true,
        title: `Customer alert: ${ruleName}`,
        description: alert['kibana.alert.reason'] ?? `The rule "${ruleName}" is firing.`,
        importance: (severity ? IMPORTANCE_BY_SEVERITY[severity] : undefined) ?? DEFAULT_IMPORTANCE,
        evidence_esql: `FROM ${hit._index}
| WHERE kibana.alert.rule.uuid == ${esqlString(ruleUuid)}
| KEEP @timestamp, kibana.alert.status, kibana.alert.reason, kibana.alert.start
| SORT @timestamp DESC
| LIMIT 5`,
        since: alert['kibana.alert.start'],
      },
    ];
  });
}

/**
 * Customer alerts: the customer's own rules, as detections. Most customer rules are classic
 * rules Alerting v2 does not see, so the engine reads the alert indices itself. It never changes
 * how those alerts are delivered, and their rules already decided, so the baseline check is
 * skipped.
 */
export const customerAlertsStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'customer_alerts',
    name: 'Customer alerts',
    watches: "The customer's own active Kibana alerts in this space (.alerts-*)",
    reportsWhen: 'An alert is active; it recovers when the alert stops being active',
    baselinePolicy: 'skip',
    reportsOnlyFiring: true,
    supportsReplay: false,
  },

  async evaluate(context) {
    const observations = await readClassicAlerts(context);
    return { observations, notes: [] };
  },
};
