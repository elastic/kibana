/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertFiringHistory } from '../../../common';
import { BUCKET_MS, HOUR_MS } from '../../../common';
import type { StrategyObservation } from '../domain';
import { esqlString } from '../esql';
import type { CustomerRuleDefinition, CustomerRuleEntity } from '../knowledge/customer_rules';
import type { ActiveRuleAlert } from './rule_events_reader';
import type { ISignalStrategy, StrategyContext, StrategyEvaluation } from './types';

const ALERTS_INDEX_PATTERN = '.alerts-*';
/** Most active alerts read per run, newest first; a storm beyond this is not more informative. */
const MAX_ALERTS = 500;
const ALERTS_QUERY_TIMEOUT_MS = 30_000;
/** Episodes read per run to judge how often alerts fire; a week of a noisy rule fits. */
const MAX_EPISODES = 10_000;
const DAY_MS = 24 * HOUR_MS;
/** A v2 alert series counts as active when its latest event in this window says so. */
const ACTIVE_ALERT_LOOKBACK_MS = 10 * BUCKET_MS;
const HISTORY_DAYS = 7;

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

function tagsOf(raw: Record<string, unknown>): string[] {
  const tags = read(raw, 'kibana.alert.rule.tags');
  return Array.isArray(tags) ? tags.map(String) : [];
}

/** A `service:<name>` tag, the convention for rules without a service field. */
function serviceTagOf(raw: Record<string, unknown>): string | undefined {
  const tag = tagsOf(raw).find((ruleTag) => ruleTag.startsWith('service:'));
  return tag ? tag.slice('service:'.length) : undefined;
}

const seriesKey = (ruleUuid: string, instanceId: string) => `${ruleUuid}:${instanceId}`;

/** The days, as UTC midnights, an episode was active on in [from, to). */
function activeDays({
  start,
  end,
  from,
  to,
}: {
  start: number;
  end: number;
  from: number;
  to: number;
}): number[] {
  const first = Math.max(from, Math.floor(start / DAY_MS) * DAY_MS);
  const last = Math.min(end, to);
  return last <= first
    ? []
    : Array.from(
        { length: Math.ceil((last - first) / DAY_MS) },
        (_, index) => first + index * DAY_MS
      );
}

/**
 * How often each rule and instance fired: episodes started in the last hour, and the days of
 * the last week, today left out, on which it was active. One query for every active alert.
 */
async function readFiringHistory({
  context,
  ruleUuids,
}: {
  context: StrategyContext;
  ruleUuids: string[];
}): Promise<Map<string, Omit<AlertFiringHistory, 'flapping'>>> {
  const now = context.to;
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  const weekStart = today - HISTORY_DAYS * DAY_MS;
  const response = await context.userEsClient.search<Record<string, unknown>>(
    {
      index: ALERTS_INDEX_PATTERN,
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: ['open', 'hidden'],
      size: MAX_EPISODES,
      _source: [
        'kibana.alert.rule.uuid',
        'kibana.alert.instance.id',
        'kibana.alert.start',
        'kibana.alert.end',
      ],
      query: {
        bool: {
          filter: [
            { terms: { 'kibana.alert.rule.uuid': ruleUuids } },
            { term: { 'kibana.space_ids': context.spaceId } },
            {
              bool: {
                // An episode that started before the week and ran into it counts too.
                should: [
                  { range: { 'kibana.alert.start': { gte: new Date(weekStart).toISOString() } } },
                  { range: { 'kibana.alert.end': { gte: new Date(weekStart).toISOString() } } },
                  { bool: { must_not: { exists: { field: 'kibana.alert.end' } } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      sort: [{ 'kibana.alert.start': { order: 'desc', unmapped_type: 'date' } }],
    },
    { signal: context.signal, requestTimeout: ALERTS_QUERY_TIMEOUT_MS }
  );

  const episodes = response.hits.hits.flatMap((hit) => {
    const raw = hit._source ?? {};
    const ruleUuid = readString(raw, 'kibana.alert.rule.uuid');
    const start = Date.parse(readString(raw, 'kibana.alert.start') ?? '');
    if (!ruleUuid || Number.isNaN(start)) {
      return [];
    }
    const end = Date.parse(readString(raw, 'kibana.alert.end') ?? '');
    return [
      {
        key: seriesKey(ruleUuid, readString(raw, 'kibana.alert.instance.id') ?? 'default'),
        start,
        end: Number.isNaN(end) ? now : end,
      },
    ];
  });
  const byKey = episodes.reduce((grouped, episode) => {
    grouped.set(episode.key, [...(grouped.get(episode.key) ?? []), episode]);
    return grouped;
  }, new Map<string, typeof episodes>());

  return new Map(
    [...byKey.entries()].map(([key, items]) => [
      key,
      {
        episodes_last_hour: items.filter((item) => item.start >= now - HOUR_MS).length,
        days_active_last_week: new Set(
          items.flatMap((item) => activeDays({ ...item, from: weekStart, to: today }))
        ).size,
      },
    ])
  );
}

/** One active alert, as read before its entity and history are known. */
interface ActiveAlert {
  index: string;
  ruleUuid: string;
  instanceId: string;
  raw: Record<string, unknown>;
}

async function readActiveAlerts(context: StrategyContext): Promise<ActiveAlert[]> {
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
  return response.hits.hits.flatMap((hit) => {
    const raw = hit._source ?? {};
    const ruleUuid = readString(raw, 'kibana.alert.rule.uuid');
    return ruleUuid
      ? [
          {
            index: hit._index,
            ruleUuid,
            instanceId: readString(raw, 'kibana.alert.instance.id') ?? 'default',
            raw,
          },
        ]
      : [];
  });
}

function definitionOf(alert: ActiveAlert): CustomerRuleDefinition {
  return {
    rule_uuid: alert.ruleUuid,
    name: readString(alert.raw, 'kibana.alert.rule.name') ?? alert.ruleUuid,
    rule_type_id: readString(alert.raw, 'kibana.alert.rule.rule_type_id'),
    tags: tagsOf(alert.raw),
    parameters: read(alert.raw, 'kibana.alert.rule.parameters'),
  };
}

/**
 * Customer alerts: the customer's own rules, as signals. Most customer rules are classic rules
 * whose alerts never reach Alerting v2's event store, so the engine reads the alert indices
 * itself, as the user. It never changes how those alerts are delivered. The rules already
 * decided the value is off, so the baseline check judges how often each alert fires instead.
 *
 * Each alert gets the entity its rule watches: the alert's own `service.name`, a `service:`
 * tag, or what knowledge from customer rules found in the rule's definition. A rule nothing
 * names keeps its name as its entity, which joins nothing.
 */
export const customerAlertsStrategy: ISignalStrategy = {
  descriptor: {
    id: 'customer_alerts',
    name: 'Customer alerts',
    watches:
      "The customer's own active alerts in this space: classic alerts (.alerts-*) and Alerting v2 alerts (.rule-events)",
    reportsWhen: 'An alert is active; it recovers when the alert stops being active',
    baselinePolicy: 'firing_frequency',
    runner: 'direct',
    reportsOnlyFiring: true,
    supportsReplay: false,
    settleMs: 0,
  },

  async evaluate(context) {
    const [classic, fromStorage] = await Promise.all([
      evaluateClassicAlerts(context),
      evaluateRuleAlerts(context),
    ]);
    return {
      observations: [...classic.observations, ...fromStorage.observations],
      notes: [...classic.notes, ...fromStorage.notes],
    };
  },
};

/** Notes about rules whose entity knowledge found in this run; stored ones were reported before. */
function entityNotes(entities: Map<string, CustomerRuleEntity>): string[] {
  return [...entities.values()]
    .filter(
      (entity) =>
        entity.found_by !== 'none' &&
        entity.service &&
        Date.parse(entity.at) > Date.now() - BUCKET_MS
    )
    .map(
      (entity) =>
        `Rule ${entity.rule_uuid} watches ${entity.service} (found in its ${
          entity.found_by === 'model' ? 'definition by a low-cost model' : 'definition'
        }).`
    );
}

/**
 * Alerts of the customer's own Alerting v2 rules, read from the shared storage where the
 * engine's signals and significant events also live.
 */
async function evaluateRuleAlerts(context: StrategyContext): Promise<StrategyEvaluation> {
  const alerts = await context.ruleEvents.activeAlerts({
    since: context.to - ACTIVE_ALERT_LOOKBACK_MS,
    signal: context.signal,
  });
  if (alerts.length === 0) {
    return { observations: [], notes: [] };
  }
  const ruleIds = [...new Set(alerts.map((alert) => alert.rule_id))];
  const [definitions, history] = await Promise.all([
    context.customerV2Rules?.(ruleIds) ??
      Promise.resolve(new Map<string, CustomerRuleDefinition>()),
    context.ruleEvents.alertHistory({ ruleIds, now: context.to, signal: context.signal }),
  ]);
  const serviceOfRow = (alert: ActiveRuleAlert) => {
    const value = alert.data['service.name'];
    return typeof value === 'string' && value ? value : undefined;
  };
  const tagged = (ruleId: string) =>
    definitions
      .get(ruleId)
      ?.tags.find((tag) => tag.startsWith('service:'))
      ?.slice('service:'.length);
  const unnamed = alerts.filter((alert) => !serviceOfRow(alert) && !tagged(alert.rule_id));
  const entities =
    (await context.customerRules?.entitiesFor(
      unnamed.flatMap((alert) => {
        const definition = definitions.get(alert.rule_id);
        return definition ? [definition] : [];
      })
    )) ?? new Map<string, CustomerRuleEntity>();

  const bucketStart = context.to - BUCKET_MS;
  const observations = alerts.map((alert): StrategyObservation => {
    const ruleName = definitions.get(alert.rule_id)?.name ?? alert.rule_id;
    const fired = history.get(`${alert.rule_id}:${alert.group_hash}`);
    const rowService = serviceOfRow(alert);
    return {
      fingerprint: `alert:v2:${alert.rule_id}:${alert.group_hash}`,
      service:
        rowService ?? tagged(alert.rule_id) ?? entities.get(alert.rule_id)?.service ?? ruleName,
      bucket_start: bucketStart,
      value: 1,
      unit: 'alert',
      looks_off: true,
      title: `Customer alert: ${ruleName}`,
      description: `The Alerting v2 rule "${ruleName}" is active${
        rowService ? ` for ${rowService}` : ''
      }.`,
      importance:
        (alert.severity ? IMPORTANCE_BY_SEVERITY[alert.severity] : undefined) ?? DEFAULT_IMPORTANCE,
      evidence_esql: `FROM .rule-events
| WHERE rule.id == ${esqlString(alert.rule_id)} AND group_hash == ${esqlString(
        alert.group_hash
      )} AND @timestamp >= NOW() - 1 hour
| KEEP @timestamp, alert.status, status
| SORT @timestamp DESC
| LIMIT 5`,
      firing_history: {
        // Alerting v2 has no flapping flag; episodes per hour say the same.
        flapping: false,
        episodes_last_hour: Math.max(1, fired?.episodes_last_hour ?? 1),
        days_active_last_week: fired?.days_active_last_week ?? 0,
      },
    };
  });
  return { observations, notes: entityNotes(entities) };
}

/** Classic alerts, read from the customer's alert indices as the user. */
async function evaluateClassicAlerts(context: StrategyContext): Promise<StrategyEvaluation> {
  const alerts = await readActiveAlerts(context);
  if (alerts.length === 0) {
    return { observations: [], notes: [] };
  }
  const unnamed = alerts.filter(
    (alert) => !readString(alert.raw, 'service.name') && !serviceTagOf(alert.raw)
  );
  const [history, entities] = await Promise.all([
    readFiringHistory({
      context,
      ruleUuids: [...new Set(alerts.map((alert) => alert.ruleUuid))],
    }),
    context.customerRules?.entitiesFor(unnamed.map(definitionOf)) ?? Promise.resolve(new Map()),
  ]);

  // Active alerts describe now, so they are reported once, in the latest settled bucket.
  const bucketStart = context.to - BUCKET_MS;
  const observations = alerts.map((alert): StrategyObservation => {
    const { raw, ruleUuid, instanceId } = alert;
    const ruleName = readString(raw, 'kibana.alert.rule.name') ?? ruleUuid;
    const severity = readString(raw, 'kibana.alert.severity');
    const fired = history.get(seriesKey(ruleUuid, instanceId));
    const flapping = read(raw, 'kibana.alert.flapping');
    return {
      fingerprint: `alert:${seriesKey(ruleUuid, instanceId)}`,
      service:
        readString(raw, 'service.name') ??
        serviceTagOf(raw) ??
        entities.get(ruleUuid)?.service ??
        ruleName,
      bucket_start: bucketStart,
      value: 1,
      unit: 'alert',
      looks_off: true,
      title: `Customer alert: ${ruleName}`,
      description: readString(raw, 'kibana.alert.reason') ?? `The rule "${ruleName}" is firing.`,
      importance: (severity ? IMPORTANCE_BY_SEVERITY[severity] : undefined) ?? DEFAULT_IMPORTANCE,
      // This rule and instance only, around now: the rows show this alert, not the rule's past.
      evidence_esql: `FROM ${alert.index}
| WHERE kibana.alert.rule.uuid == ${esqlString(
        ruleUuid
      )} AND kibana.alert.instance.id == ${esqlString(instanceId)} AND @timestamp >= NOW() - 1 hour
| KEEP @timestamp, kibana.alert.status, kibana.alert.reason, kibana.alert.start
| SORT @timestamp DESC
| LIMIT 5`,
      since: readString(raw, 'kibana.alert.start'),
      firing_history: {
        flapping: flapping === true || flapping === 'true',
        episodes_last_hour: fired?.episodes_last_hour ?? 1,
        days_active_last_week: fired?.days_active_last_week ?? 0,
      },
    };
  });
  return { observations, notes: entityNotes(entities) };
}
