/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { QueryLink } from '@kbn/significant-events-schema';
import { BUCKET_MS, HOUR_MS } from '../../../common';
import type { OwnedRule, StrategyObservation } from '../domain';
import { getErrorMessage } from '../errors';
import {
  bucketStarts,
  esqlString,
  field,
  listColumns,
  queryRows,
  timeRangeWhere,
  toEpoch,
  toNumber,
} from '../esql';
import { extractKiCondition, validateKiConditions, type KiCondition } from './ki_conditions';
import { buildSignalRule } from './rule_definitions';
import { latestRowPerKey, type RuleEventRow } from './rule_events_reader';
import type {
  DesiredRules,
  IDetectionStrategy,
  ReplayContext,
  StrategyContext,
  StrategyEvaluation,
} from './types';

const STRATEGY_NAME = 'Rules from KIs';
const DEFAULT_IMPORTANCE = 50;
/** One `COUNT(*) WHERE` per KI; past this a source gets a second rule rather than a wider one. */
const MAX_KIS_PER_RULE = 50;
/** Same cadence as the health checks: every minute, re-emitting the last three closed minutes. */
const RULE_EVERY = '1m';
const RULE_LOOKBACK = '4m';
const RULE_CLOSED_BUCKETS = 3;
/** A service that matched a KI in the last hour keeps being reported, at zero once it stops. */
const ACTIVE_WINDOW_MS = HOUR_MS;
const REPLAY_ROW_LIMIT = 10_000;
const MAX_SKIP_DETAILS = 3;

/** One KI on one service: the series the baseline judges. */
const seriesFingerprint = (sourceId: string, kiId: string, service: string) =>
  `ki:${sourceId}:${kiId}:${service}`;
/** Proves the KI was counted in a minute, so a service without matches then counts as zero. */
const heartbeatFingerprint = (sourceId: string, kiId: string) => `ki_watch:${sourceId}:${kiId}`;
const countColumn = (index: number) => `k${index}`;

/** KI queries name a service when they were learned from one; others match across services. */
function serviceFromQuery(esqlQuery: string): string | undefined {
  return esqlQuery.match(/`?service\.name`?\s*==\s*"([^"]+)"/)?.[1];
}

/**
 * Counts every KI of the chunk per minute, and per service when the source has one. The first
 * WHERE keeps only lines some KI matches, so the rule returns rows only where something matched.
 */
function countPipeline(conditions: KiCondition[], byService: boolean): string {
  const counts = conditions
    .map((item, index) => `${countColumn(index)} = COUNT(*) WHERE ${item.condition}`)
    .join(', ');
  const groups = byService
    ? `service = ${field('service.name')}, bucket = BUCKET(@timestamp, 1 minute)`
    : 'bucket = BUCKET(@timestamp, 1 minute)';
  return `| WHERE ${conditions.map((item) => item.condition).join(' OR ')}
| STATS ${counts} BY ${groups}`;
}

function chunked<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );
}

function parseKiIds(meta: OwnedRule['meta']): string[] {
  try {
    const parsed: unknown = JSON.parse(meta?.ki_ids ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    return [];
  }
}

/** The match KIs of one source that one shared rule can count, and why the others cannot. */
async function countableKis({
  context,
  source,
  links,
}: {
  context: { dataEsClient: ElasticsearchClient; signal: AbortSignal };
  source: NightshiftSource;
  links: QueryLink[];
}): Promise<{ valid: KiCondition[]; skipped: string[]; byService: boolean }> {
  const own = links
    .filter((link) => link.source_id === source.id)
    .sort((a, b) => a.query.id.localeCompare(b.query.id));
  const extracted = own
    .filter((link) => link.query.type === 'match')
    .map((link) => extractKiCondition(link, source.view_name));
  const conditions = extracted.filter((item): item is KiCondition => 'condition' in item);
  const unparsed = extracted.filter((item) => 'reason' in item);
  const [{ valid, invalid }, columns] = await Promise.all([
    validateKiConditions({
      esClient: context.dataEsClient,
      viewName: source.view_name,
      conditions,
      signal: context.signal,
    }),
    listColumns({ esClient: context.dataEsClient, from: source.view_name, signal: context.signal }),
  ]);
  const skipped = [...unparsed, ...invalid].map(
    (item) => `"${item.link.query.title}" ${'reason' in item ? item.reason : ''}`
  );
  return { valid, skipped, byService: columns.includes('service.name') };
}

function toObservation({
  link,
  source,
  service,
  byService,
  bucketStart,
  value,
  ruleId,
}: {
  link: QueryLink;
  source: NightshiftSource;
  service: string;
  byService: boolean;
  bucketStart: number;
  value: number;
  ruleId?: string;
}): StrategyObservation {
  const base = link.query.esql.query.trim();
  const crossService = byService && serviceFromQuery(base) === undefined;
  return {
    fingerprint: seriesFingerprint(source.id, link.query.id, service),
    service,
    bucket_start: bucketStart,
    value,
    unit: 'count',
    looks_off: value > 0,
    // A KI learned across services gets the service in its title, so two services stay apart.
    title: crossService ? `${link.query.title} on ${service}` : link.query.title,
    description: `${value} log lines${byService ? ` from ${service}` : ''} matched the KI "${
      link.query.title
    }". ${link.query.description}`.trim(),
    importance: link.query.severity_score ?? DEFAULT_IMPORTANCE,
    evidence_esql: `${base}\n| WHERE ${timeRangeWhere(bucketStart, bucketStart + BUCKET_MS)}${
      byService ? ` AND ${field('service.name')} == ${esqlString(service)}` : ''
    }\n| SORT @timestamp DESC\n| LIMIT 20`,
    source_id: source.id,
    rule_id: ruleId,
    heartbeat: heartbeatFingerprint(source.id, link.query.id),
  };
}

function heartbeatOf({
  source,
  link,
  bucketStart,
  total,
}: {
  source: NightshiftSource;
  link: QueryLink;
  bucketStart: number;
  total: number;
}): StrategyObservation {
  return {
    fingerprint: heartbeatFingerprint(source.id, link.query.id),
    service: source.title,
    bucket_start: bucketStart,
    value: total,
    unit: 'count',
    looks_off: false,
    internal: true,
    title: `${link.query.title} counted`,
    description: `${total} log lines matched across the source.`,
    importance: 0,
    evidence_esql: '',
    source_id: source.id,
  };
}

/**
 * Turns per-minute rows into observations: a heartbeat per KI and minute, a series per KI and
 * service with matches, and zeros for services that matched within the last hour, so an open
 * event can see its problem stop.
 */
function deriveObservations({
  source,
  links,
  byService,
  buckets,
  countsOf,
  active,
  ruleId,
}: {
  source: NightshiftSource;
  links: QueryLink[];
  byService: boolean;
  buckets: number[];
  /** Matches per service of the KI at `index` in the bucket. */
  countsOf: (bucketStart: number, index: number) => Map<string, number>;
  active: Array<{ fingerprint: string; service: string }>;
  ruleId?: string;
}): StrategyObservation[] {
  return buckets.flatMap((bucketStart) =>
    links.flatMap((link, index) => {
      const counts = countsOf(bucketStart, index);
      const matched = [...counts.entries()].filter(([, value]) => value > 0);
      const total = matched.reduce((sum, [, value]) => sum + value, 0);
      const quiet = active.filter(
        (series) =>
          (counts.get(series.service) ?? 0) === 0 &&
          series.fingerprint === seriesFingerprint(source.id, link.query.id, series.service)
      );
      return [
        heartbeatOf({ source, link, bucketStart, total }),
        ...[...matched, ...quiet.map((series): [string, number] => [series.service, 0])].map(
          ([service, value]) =>
            toObservation({ link, source, service, byService, bucketStart, value, ruleId })
        ),
      ];
    })
  );
}

function serviceOfRow(data: Record<string, unknown>, fallback: string): string {
  return data.service === undefined || data.service === null ? fallback : String(data.service);
}

async function evaluateLive(context: StrategyContext): Promise<StrategyEvaluation> {
  const sourcesById = new Map(context.sources.map((source) => [source.id, source]));
  const rules = context.ownedRules.filter((rule) => sourcesById.has(rule.source_id));
  if (rules.length === 0) {
    return { observations: [], notes: [], watchedRules: 0 };
  }
  const [{ rows, truncated }, links] = await Promise.all([
    context.ruleEvents.read({
      ruleIds: rules.map((rule) => rule.rule_id),
      since: context.from,
      maxRows: context.maxRows,
      signal: context.signal,
    }),
    context.getQueryLinks(),
  ]);
  const linksById = new Map(links.map((link) => [link.query.id, link]));
  const buckets = bucketStarts(context.from, context.to, BUCKET_MS);

  const perRule = await Promise.all(
    rules.map(async (rule) => {
      const source = sourcesById.get(rule.source_id)!;
      // A KI deleted since the rule was built is skipped until the rule is rebuilt.
      const ruleLinks = parseKiIds(rule.meta).map((id) => linksById.get(id));
      const byService = rule.meta?.by_service === 'true';
      const latest = latestRowPerKey(
        rows.filter((row) => row.rule_id === rule.rule_id),
        (row) => {
          const bucket = toEpoch(row.data.bucket);
          return bucket >= context.from && bucket < context.to
            ? `${serviceOfRow(row.data, source.title)}|${bucket}`
            : undefined;
        }
      );
      const byBucket = [...latest.values()].reduce((groups, row) => {
        const bucket = toEpoch(row.data.bucket);
        groups.set(bucket, [...(groups.get(bucket) ?? []), row]);
        return groups;
      }, new Map<number, RuleEventRow[]>());
      const active = await context.records.recentSeries({
        strategy: 'ki_rules',
        fingerprintPrefix: `ki:${source.id}:`,
        since: new Date(context.from - ACTIVE_WINDOW_MS).toISOString(),
        activeOnly: true,
      });
      // A minute with no row matched nothing: the rule only returns minutes with a match. If
      // the rule did not run at all, the minutes are read as zeros; outages longer than the
      // live window are evaluated directly instead.
      const indexed = ruleLinks.flatMap((link, index) => (link ? [{ link, index }] : []));
      return deriveObservations({
        source,
        links: indexed.map(({ link }) => link),
        byService,
        buckets,
        countsOf: (bucketStart, position) => {
          const column = countColumn(indexed[position].index);
          return new Map(
            (byBucket.get(bucketStart) ?? []).map((row) => [
              serviceOfRow(row.data, source.title),
              toNumber(row.data[column]),
            ])
          );
        },
        active,
        ruleId: rule.rule_id,
      });
    })
  );
  return { observations: perRule.flat(), notes: [], truncated, watchedRules: rules.length };
}

async function evaluateReplay(context: ReplayContext): Promise<StrategyEvaluation> {
  const links = await context.getQueryLinks();
  const buckets = bucketStarts(context.from, context.to, BUCKET_MS);
  const results = await Promise.all(
    context.sources.map(async (source): Promise<StrategyEvaluation> => {
      try {
        const { valid, skipped, byService } = await countableKis({ context, source, links });
        const perChunk = await Promise.all(
          chunked(valid, MAX_KIS_PER_RULE).map(async (chunk) => {
            const { rows } = await queryRows({
              esClient: context.dataEsClient,
              query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(context.from, context.to)}
${countPipeline(chunk, byService)}
| LIMIT ${REPLAY_ROW_LIMIT}`,
              signal: context.signal,
              timeoutMs: 120_000,
            });
            return deriveObservations({
              source,
              links: chunk.map((item) => item.link),
              byService,
              buckets,
              countsOf: (bucketStart, index) =>
                new Map(
                  rows
                    .filter((row) => toEpoch(row.bucket) === bucketStart)
                    .map((row) => [
                      serviceOfRow(row, source.title),
                      toNumber(row[countColumn(index)]),
                    ])
                ),
              // Replay has no stored series to keep at zero; the heartbeat covers baselines.
              active: [],
            });
          })
        );
        return {
          observations: perChunk.flat(),
          notes:
            skipped.length > 0
              ? [`${source.title}: ${skipped.slice(0, MAX_SKIP_DETAILS).join('; ')}`]
              : [],
        };
      } catch (error) {
        return { observations: [], notes: [`${source.title}: ${getErrorMessage(error)}`] };
      }
    })
  );
  return {
    observations: results.flatMap((result) => result.observations),
    notes: results.flatMap((result) => result.notes),
  };
}

/**
 * Rules from KIs. Every match query learned for a source is counted, promoted or not: one
 * Alerting v2 rule per source counts all of them per service and minute, so a KI watches from
 * the moment it is learned. Each KI and service is its own series, so one KI matching two
 * unrelated services raises two detections, and the baseline check judges each against its
 * own normal.
 */
export const kiRulesStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'ki_rules',
    name: STRATEGY_NAME,
    watches:
      'Every match KI query of the enabled sources, counted per service and minute by one rule per source',
    reportsWhen: 'A KI query matches at least one log line of a service in the minute',
    baselinePolicy: 'own_history',
    runner: 'alerting_v2_rule',
    reportsOnlyFiring: false,
    supportsReplay: true,
    // One rule run per minute, plus room for a late one.
    settleMs: 150_000,
    liveWindowMs: 270_000,
  },

  evaluate: evaluateLive,

  replay: evaluateReplay,

  async desiredRules(context): Promise<DesiredRules> {
    const links = await context.getQueryLinks();
    const results = await Promise.all(
      context.sources.map(async (source) => {
        try {
          const { valid, skipped, byService } = await countableKis({ context, source, links });
          const rules = chunked(valid, MAX_KIS_PER_RULE).map((chunk) => ({
            ...buildSignalRule({
              spaceId: context.spaceId,
              strategy: 'ki_rules',
              strategyName: STRATEGY_NAME,
              source,
              query: `FROM ${source.view_name}
${countPipeline(chunk, byService)}
| WHERE bucket < DATE_TRUNC(1 minute, NOW()) AND bucket >= DATE_TRUNC(1 minute, NOW()) - ${RULE_CLOSED_BUCKETS} minutes`,
              every: RULE_EVERY,
              lookback: RULE_LOOKBACK,
              groupBy: byService ? ['service', 'bucket'] : ['bucket'],
              cpsEnabled: context.cpsEnabled,
            }),
            // The column `k<n>` of a row counts the KI at position n.
            meta: {
              ki_ids: JSON.stringify(chunk.map((item) => item.link.query.id)),
              by_service: String(byService),
            },
          }));
          return {
            rules,
            skipped:
              skipped.length > 0
                ? [
                    {
                      source_id: source.id,
                      reason: `${skipped.length} KI(s) not counted: ${skipped
                        .slice(0, MAX_SKIP_DETAILS)
                        .join('; ')}`,
                    },
                  ]
                : [],
          };
        } catch (error) {
          return { rules: [], skipped: [{ source_id: source.id, reason: getErrorMessage(error) }] };
        }
      })
    );
    return {
      rules: results.flatMap((result) => result.rules),
      skipped: results.flatMap((result) => result.skipped),
    };
  },
};
