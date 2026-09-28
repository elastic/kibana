/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps the hunt coordinator's raw Tier 1 / Tier 2 output into the
 * `security.significant_security_event` attachment data shape.
 *
 * `buildSseData` returns one SSE entry per technique this run corroborated (a
 * single report-scoped entry when none did), each carrying its own
 * computed `attachment_id`. The caller attaches every entry to the
 * Investigation with `ai.attachment.add`. The payload is schema-complete
 * (title, severity, evidence, …) so attach validates without a second fill
 * step; `maps_to_proposal` stays unset until packaging mints.
 */

import { createHash } from 'crypto';
import dateMath from '@kbn/datemath';
import {
  huntIocSchema,
  type SignificantSecurityEventAttachmentData,
} from '../../../../../common/significant_security_event_schema';
import type { SeverityLevel } from '../../../../../common/attachment_enums';
import type { HuntCoordinatorCoreResult } from '../hunt_coordinator';

/**
 * Full SSE attachment payload produced by this mapper. Derived from the
 * schema so a required-field change fails here at compile time.
 * `maps_to_proposal` is intentionally omitted: packaging fills it after mint.
 */
export type SseAttachmentData = Omit<SignificantSecurityEventAttachmentData, 'maps_to_proposal'>;

type SseEntityRef = SseAttachmentData['entities'][number];
type SseSecurityKnowledgeIndicator = SseAttachmentData['security_knowledge_indicators'][number];
type SseEventRef = NonNullable<SseAttachmentData['events']>[number];
type SseAlertRef = NonNullable<SseAttachmentData['alerts']>[number];
type SseHuntResult = NonNullable<SseAttachmentData['hunt_result']>;
type SseHitSource = SseHuntResult['hit_sources'][number];
type SseBehavior = NonNullable<SseHuntResult['tier2']>['behaviors'][number];
type CoordinatorBehavior = NonNullable<HuntCoordinatorCoreResult['tier2']>['behaviors'][number];

/** One SSE attachment, ready to be written with `ai.attachment.add`. */
export interface SseEntry {
  attachment_id: string;
  data: SseAttachmentData;
}

const SOURCE_WATCH_MANAGED_ID = 'system-security-hunt-continuous-threat-hunt';
const CAPABILITY_ID = 'continuous_threat_hunt';
const MAX_ENTITIES = 50;
const MAX_HIT_REFS = 50;
const MAX_EVIDENCE = 50;
const MAX_TIMELINE = 50;
/**
 * Schema caps the mapper must hold the coordinator's output to. Tier 1 aggregates
 * up to 500 `per_index` buckets and echoes up to 100 request IOCs; the SSE schema
 * accepts 20 and 50. Copying either through unsliced fails `ai.attachment.add`.
 */
const MAX_PER_INDEX = 20;
const MAX_RESOLVED_IOCS = 50;
const MAX_INDICATORS = 50;
const MAX_BEHAVIOR_ENTITIES = 20;
const MAX_ENTITY_NAME_LENGTH = 512;
/**
 * Tier 2's generation budget caps how many proposals get a query, not how many validate, so
 * `behaviors` can arrive longer than the schema accepts — and the report-scoped entry is the
 * one that lists all of them.
 */
const MAX_BEHAVIORS = 20;

/**
 * Window bounds: the SSE schema requires `.datetime()` (ISO 8601, UTC `Z`), while
 * Tier 1 echoes the caller's window verbatim, which may be date math (`now-24h`,
 * accepted on purpose by `assertHuntWindow`). Resolve it here so a valid
 * coordinator result never produces an SSE the schema rejects. Returns
 * `undefined` for a value that is neither valid date math nor a parseable date.
 * Document timestamps use `toIsoInstant` instead.
 */
const toIsoDatetime = (value: string | undefined, forceNow: Date): string | undefined => {
  if (!value) return undefined;
  const parsed = dateMath.parse(value, { forceNow });
  if (!parsed?.isValid()) return undefined;
  return parsed.toISOString();
};

/**
 * Strict form for document timestamps: an ISO 8601 string (any offset) or an
 * `epoch_millis` / `epoch_second` digit string, which is what `_source['@timestamp']`
 * carries under the common ES date formats. Date math is deliberately NOT accepted
 * here: `now-1d` in a document is a malformed value, not a relative instant, and
 * resolving it would stamp a fabricated time onto an event ref.
 */
const toIsoInstant = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if (/^\d{10}$|^\d{13}$/.test(value)) {
    const epoch = value.length === 13 ? Number(value) : Number(value) * 1000;
    return new Date(epoch).toISOString();
  }
  const millis = Date.parse(value);
  return Number.isNaN(millis) ? undefined : new Date(millis).toISOString();
};

/**
 * `time_range` is a required datetime pair on the schema, so an unparseable bound
 * cannot be dropped the way an optional hit timestamp can. Both bounds resolve
 * against one `now` for the whole run, matching `assertHuntWindow`.
 *
 * That `now` is mapping time, which is after the hunt ran: Tier 1 and each Tier 2
 * execute hand the date math to Elasticsearch, which resolves it itself, so no
 * component reports the instants it actually searched. Closing that gap means
 * resolving the window once in the coordinator before Tier 1 and carrying
 * absolute bounds through both tiers; until then a relative window drifts by
 * roughly the duration of the run.
 */
const toIsoTimeRange = (
  range: { from: string; to: string },
  forceNow: Date
): { from: string; to: string } => {
  const from = toIsoDatetime(range.from, forceNow);
  const to = toIsoDatetime(range.to, forceNow);
  if (!from || !to) {
    throw new Error(
      `sse_mapper: hunt time_range is not a parseable date or date math (from "${range.from}", to "${range.to}")`
    );
  }
  return { from, to };
};

/**
 * Subject-stable SSE attachment id: `sse-{sha256(JSON [space, reportId, technique|null])}`.
 * Omitting `technique` gives the report-scoped fallback id used when no
 * technique was corroborated.
 *
 * The parts are JSON-encoded rather than joined on a delimiter because nothing constrains a
 * report id's characters: with `|`, the report `r|T1078.004` and the pair (`r`, `T1078.004`)
 * hash the same subject, and since this id is the idempotency key for a re-hunt, one report's
 * findings would overwrite the other's. Changing the encoding costs nothing today and a
 * migration once ids exist.
 */
export const buildSseAttachmentId = ({
  spaceId,
  reportId,
  techniqueId,
}: {
  spaceId: string;
  reportId: string;
  techniqueId?: string;
}): string => {
  const subject = JSON.stringify([spaceId, reportId, techniqueId ?? null]);
  const hash = createHash('sha256').update(subject).digest('hex');
  return `sse-${hash}`;
};

/** Options the caller supplies beyond the coordinator result. */
export interface SseMapperOptions {
  spaceId: string;
}

/**
 * Builds `security_knowledge_indicators`. When `onlyTechniqueId` is set, the
 * output is scoped to that one technique. Each SSE is 1:1 with a Proposal, so
 * a two-technique hit run must not put both techniques' behaviors/rule names on
 * either SSE.
 */
const buildSecurityKnowledgeIndicators = (
  result: HuntCoordinatorCoreResult,
  onlyTechniqueId?: string
): SseSecurityKnowledgeIndicator[] => {
  const { tier1, tier2 } = result;
  const indicators: SseSecurityKnowledgeIndicator[] = result.technologies.map(
    (technology): SseSecurityKnowledgeIndicator => ({ type: 'technology', value: technology })
  );

  // Techniques go before the IOC echo: each SSE is 1:1 with a Proposal, so its
  // technique indicator must survive the cap, while the IOCs (up to 100 from the
  // request, schema cap 50 for the whole array) take whatever room is left.
  if (tier2) {
    for (const behavior of tier2.behaviors) {
      if (onlyTechniqueId && behavior.technique_id !== onlyTechniqueId) continue;
      indicators.push({
        type: 'technique',
        value: `${behavior.technique_id} (${behavior.technique_name})`,
        confidence: behavior.confidence,
        technique_id: behavior.technique_id,
      });
    }
  }

  for (const ioc of tier1.resolved_iocs) {
    if (indicators.length >= MAX_INDICATORS) break;
    indicators.push({
      type: 'ioc',
      value: ioc.value,
      ioc: { type: ioc.type, value: ioc.value },
    });
  }

  return indicators.slice(0, MAX_INDICATORS);
};

/**
 * Fills one capped array from a report-wide Tier 1 list and a (usually
 * technique-scoped) Tier 2 list without letting the first starve the second:
 * take alternately, so whichever list is shorter survives whole. Tier 1 can fill
 * any of these caps on its own — 50 affected hosts and a 100-row hit sample are
 * both within budget — and its rows are the report's, while Tier 2's are the
 * evidence for the technique this entry is about.
 *
 * Duplicates are dropped by `keyOf` before the cap applies, so `originalCount`
 * counts what could have been shown rather than what was offered: a host Tier 1
 * and Tier 2 both name is one entity, not a truncated pair.
 */
const takeAlternating = <T>(
  tier1: readonly T[],
  tier2: readonly T[],
  limit: number,
  keyOf: (item: T) => string
): { taken: T[]; tier1Count: number; truncated: boolean; originalCount: number } => {
  const seen = new Set<string>();
  const unique = [tier1, tier2].map((pool) =>
    pool.filter((item) => {
      const key = keyOf(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  );

  const taken: T[] = [];
  let tier1Count = 0;
  const cursors = [0, 0];
  while (taken.length < limit && cursors.some((cursor, pool) => cursor < unique[pool].length)) {
    for (const pool of [0, 1]) {
      if (taken.length >= limit || cursors[pool] >= unique[pool].length) continue;
      taken.push(unique[pool][cursors[pool]]);
      cursors[pool] += 1;
      if (pool === 0) tier1Count += 1;
    }
  }

  const originalCount = unique[0].length + unique[1].length;
  return { taken, tier1Count, truncated: originalCount > taken.length, originalCount };
};

/**
 * Whether a hit's index cleared Tier 1's hit bar. `per_index` carries the `required` flag for
 * every index the search touched, so the answer is in the result and the mapper does not need
 * the scope patterns. An index absent from the breakdown is treated as not required: the
 * conservative reading, since promoting on it would be a claim nothing in the result supports.
 */
const isRequiredIndex = (result: HuntCoordinatorCoreResult, index: string): boolean =>
  result.tier1.per_index.some((entry) => entry.index === index && entry.required);

const scopedBehaviors = (
  result: HuntCoordinatorCoreResult,
  onlyTechniqueId?: string
): CoordinatorBehavior[] =>
  (result.tier2?.behaviors ?? []).filter(
    (behavior) => !onlyTechniqueId || behavior.technique_id === onlyTechniqueId
  );

/**
 * Union Tier 1 affected assets with Tier 2 execute hosts/users (technique-scoped
 * when `onlyTechniqueId` is set). Cap 50 with a truncation marker on the entry.
 */
const buildEntities = (
  result: HuntCoordinatorCoreResult,
  onlyTechniqueId?: string
): { entities: SseEntityRef[]; truncated: boolean; originalCount: number } => {
  const { hosts, users, services } = result.tier1.affected_assets;
  const tier1Entities: SseEntityRef[] = [
    ...hosts.map((host): SseEntityRef => ({ field: 'host.name', value: host.name })),
    ...users.map((user): SseEntityRef => ({ field: 'user.name', value: user.name })),
    // Assumed-role / service-principal identities stay out of user.name.
    ...services.map((service): SseEntityRef => ({ field: 'service.name', value: service.name })),
  ];

  const tier2Entities = scopedBehaviors(result, onlyTechniqueId).flatMap(
    (behavior): SseEntityRef[] => [
      ...(behavior.affected_hosts ?? []).map(
        (host): SseEntityRef => ({ field: 'host.name', value: host })
      ),
      ...(behavior.affected_users ?? []).map(
        (user): SseEntityRef => ({ field: 'user.name', value: user })
      ),
    ]
  );

  const { taken, truncated, originalCount } = takeAlternating(
    tier1Entities,
    tier2Entities,
    MAX_ENTITIES,
    (entity) => `${entity.field}|${entity.value}`
  );

  return { entities: taken, truncated, originalCount };
};

const DATA_STREAM_BACKING_PREFIX = '.ds-';

/**
 * Alerts indices are hidden (`.alerts-security.alerts-*` and their
 * `.internal.alerts-*` backing indices), and the attachment schema rejects a
 * hidden index as an event source. Strip a data stream backing prefix first so
 * `.ds-logs-aws...` is not mistaken for a hidden index.
 */
const isAlertsIndex = (index: string): boolean => {
  const bare = index.startsWith(DATA_STREAM_BACKING_PREFIX)
    ? index.slice(DATA_STREAM_BACKING_PREFIX.length)
    : index;
  return bare.startsWith('.');
};

/**
 * A hit's `timestamp` is the raw indexed `@timestamp` string, so it may carry an
 * offset (`+02:00`) or be an epoch string; the schema requires ISO `Z`. An
 * unparseable value is dropped rather than failing the whole attachment.
 */
const hitTimestamp = (hit: { timestamp?: string }): string | undefined =>
  toIsoInstant(hit.timestamp);

const toEventMatched = (
  matched: HuntCoordinatorCoreResult['tier1']['hits'][number]['matched']
): SseEventRef['matched'] | undefined => {
  if (!matched) return undefined;
  // Schema requires `field` whenever `matched` is present.
  if (!matched.field) return undefined;
  // The coordinator types `ioc.type` as a free string; the SSE schema only
  // accepts the IOC enum, so drop an ioc the schema would reject.
  const ioc = matched.ioc ? huntIocSchema.safeParse(matched.ioc) : undefined;
  return {
    field: matched.field,
    ...(ioc?.success ? { ioc: ioc.data } : {}),
    ...(matched.technique_id ? { technique_id: matched.technique_id } : {}),
  };
};

/**
 * Tier 1 hits become event/alert refs. When `onlyTechniqueId` is set:
 * - include hits with `matched.technique_id === onlyTechniqueId`
 * - include IOC-only / unscoped hits (no technique_id) as shared context
 * - exclude hits attributed to a different technique
 */
const splitHits = (
  result: HuntCoordinatorCoreResult,
  onlyTechniqueId?: string
): { events: SseEventRef[]; alerts: SseAlertRef[] } => {
  const events: SseEventRef[] = [];
  const alerts: SseAlertRef[] = [];
  for (const hit of result.tier1.hits) {
    const attributedTechnique = hit.matched?.technique_id?.toUpperCase();
    if (
      onlyTechniqueId &&
      attributedTechnique &&
      attributedTechnique !== onlyTechniqueId.toUpperCase()
    ) {
      continue;
    }
    const timestamp = hitTimestamp(hit);
    const matched = toEventMatched(hit.matched);
    if (isAlertsIndex(hit.index)) {
      alerts.push({
        alert_id: hit.id,
        index: hit.index,
        ...(timestamp ? { timestamp } : {}),
      });
    } else {
      events.push({
        event_id: hit.id,
        source_index: hit.index,
        ...(timestamp ? { timestamp } : {}),
        ...(matched ? { matched } : {}),
      });
    }
  }
  return { events, alerts };
};

/** Tier 2 execute hits as refs, split the same way Tier 1's are. */
const behaviorHitRefs = (
  behaviors: CoordinatorBehavior[]
): { events: SseEventRef[]; alerts: SseAlertRef[] } => {
  const events: SseEventRef[] = [];
  const alerts: SseAlertRef[] = [];
  for (const behavior of behaviors) {
    for (const ref of behavior.hits ?? []) {
      const timestamp = hitTimestamp(ref);
      if (isAlertsIndex(ref.index)) {
        alerts.push({
          alert_id: ref.id,
          index: ref.index,
          ...(timestamp ? { timestamp } : {}),
        });
      } else {
        events.push({
          event_id: ref.id,
          source_index: ref.index,
          ...(timestamp ? { timestamp } : {}),
          matched: {
            technique_id: behavior.technique_id,
            field: '_id',
          },
        });
      }
    }
  }
  return { events, alerts };
};

/**
 * Both ref arrays hold Tier 1's sample and the scoped Tier 2 hits under one cap.
 * Tier 1 returns up to the coordinator's `size: 100`, so appending Tier 2 after it
 * could drop every ref to the behavior that confirmed the technique, leaving its
 * SSE with no navigable evidence of its own hit. `tier1RefCount` counts the Tier 1
 * refs the entry ends up carrying, not the ones offered.
 */
const mergeTierHitRefs = ({
  result,
  onlyTechniqueId,
}: {
  result: HuntCoordinatorCoreResult;
  onlyTechniqueId?: string;
}): { events: SseEventRef[]; alerts: SseAlertRef[]; tier1RefCount: number } => {
  const { events: tier1Events, alerts: tier1Alerts } = splitHits(result, onlyTechniqueId);
  const { events: tier2Events, alerts: tier2Alerts } = behaviorHitRefs(
    scopedBehaviors(result, onlyTechniqueId)
  );

  const events = takeAlternating(
    tier1Events,
    tier2Events,
    MAX_HIT_REFS,
    (event) => `${event.source_index}|${event.event_id}`
  );
  const alerts = takeAlternating(
    tier1Alerts,
    tier2Alerts,
    MAX_HIT_REFS,
    (alert) => `${alert.index}|${alert.alert_id}`
  );

  return {
    events: events.taken,
    alerts: alerts.taken,
    tier1RefCount: events.tier1Count + alerts.tier1Count,
  };
};

/**
 * Tier 2 reads `host.name` / `user.name` straight out of the execute response and bounds
 * only how many it keeps, not how long each is, while the schema caps an entity name at 512.
 * An ES|QL rule the model wrote can evaluate a column into something far longer, and one
 * oversized name would cost the whole attachment, so trim rather than drop the finding.
 */
const boundedEntityNames = (names: string[]): string[] =>
  names.slice(0, MAX_BEHAVIOR_ENTITIES).map((name) => name.slice(0, MAX_ENTITY_NAME_LENGTH));

const mapBehavior = (behavior: CoordinatorBehavior): SseBehavior => ({
  technique_id: behavior.technique_id,
  ...(behavior.technique_name ? { technique_name: behavior.technique_name } : {}),
  tactic_ids: behavior.tactic_ids,
  confidence: behavior.confidence,
  title: behavior.title,
  ...(behavior.validated_esql ? { validated_esql: behavior.validated_esql.slice(0, 32_000) } : {}),
  ...(behavior.execution
    ? {
        execution: {
          executed: behavior.execution.executed,
          row_count: behavior.execution.row_count,
          hit: behavior.execution.hit,
          // Without this, `hit: false` is ambiguous: Tier 2 uses it both for "nothing
          // there" and for "returned rows the required-index bar could not evaluate".
          // Only the first is evidence of a clean environment.
          ...(behavior.execution.inconclusive_reason
            ? { inconclusive_reason: behavior.execution.inconclusive_reason }
            : {}),
        },
      }
    : {}),
  ...(behavior.affected_hosts && behavior.affected_hosts.length > 0
    ? { affected_hosts: boundedEntityNames(behavior.affected_hosts) }
    : {}),
  ...(behavior.affected_users && behavior.affected_users.length > 0
    ? { affected_users: boundedEntityNames(behavior.affected_users) }
    : {}),
  ...(behavior.affected_hosts_truncated ? { affected_hosts_truncated: true } : {}),
  ...(behavior.affected_users_truncated ? { affected_users_truncated: true } : {}),
});

const resolveHitSources = ({
  result,
  onlyTechniqueId,
  tier1RefCount,
}: {
  result: HuntCoordinatorCoreResult;
  onlyTechniqueId?: string;
  tier1RefCount: number;
}): { has_confirmed_hit: boolean; hit_sources: SseHitSource[] } => {
  const sources: SseHitSource[] = [];

  const tier1Source =
    result.tier1.has_confirmed_hit &&
    // Report-scoped: any Tier 1 confirmed hit counts.
    // Technique-scoped: only when this entry still carries Tier 1 refs
    // (technique-attributed or shared IOC-only).
    (!onlyTechniqueId || tier1RefCount > 0);
  if (tier1Source) {
    sources.push('tier1');
  }

  const tier2Source = scopedBehaviors(result, onlyTechniqueId).some(
    (behavior) => behavior.execution?.hit === true
  );
  if (tier2Source) {
    sources.push('tier2');
  }

  return {
    has_confirmed_hit: sources.length > 0,
    hit_sources: sources,
  };
};

const buildHuntResult = (
  result: HuntCoordinatorCoreResult,
  {
    onlyTechniqueId,
    tier1RefCount,
    forceNow,
  }: {
    onlyTechniqueId?: string;
    tier1RefCount: number;
    forceNow: Date;
  }
): SseHuntResult => {
  const { tier1, tier2 } = result;
  const scoped = scopedBehaviors(result, onlyTechniqueId);
  const { has_confirmed_hit, hit_sources } = resolveHitSources({
    result,
    onlyTechniqueId,
    tier1RefCount,
  });

  // Required indices set the hit bar, so when the bucket list overflows the
  // schema cap they are the rows to keep; optional-index buckets fill the rest.
  // `sort` is stable, so Tier 1's doc-count order survives within each group.
  const perIndex = [...tier1.per_index]
    .sort((a, b) => Number(b.required) - Number(a.required))
    .slice(0, MAX_PER_INDEX)
    .map((entry) => ({
      index: entry.index,
      hit_count: entry.hit_count,
      required: entry.required,
    }));

  return {
    has_confirmed_hit,
    hit_sources,
    time_range: toIsoTimeRange(tier1.time_range, forceNow),
    tier1: {
      status: tier1.status,
      counts: {
        total_hits: tier1.counts.total_hits,
        returned_hits: tier1.counts.returned_hits,
        affected_hosts: tier1.counts.affected_hosts,
        affected_users: tier1.counts.affected_users,
      },
      per_index: perIndex,
      resolved_iocs: tier1.resolved_iocs
        .slice(0, MAX_RESOLVED_IOCS)
        .map((ioc) => ({ type: ioc.type, value: ioc.value })),
      // `evidence_for` points readers at `per_index` for the breakdown, so a silent cut
      // would read as the whole distribution.
      ...(tier1.per_index.length > MAX_PER_INDEX ? { per_index_truncated: true } : {}),
      ...(tier1.resolved_iocs.length > MAX_RESOLVED_IOCS ? { resolved_iocs_truncated: true } : {}),
    },
    tier2: tier2
      ? {
          status: tier2.status,
          behaviors: scoped.slice(0, MAX_BEHAVIORS).map(mapBehavior),
          ...(scoped.length > MAX_BEHAVIORS ? { behaviors_truncated: true } : {}),
        }
      : undefined,
  };
};

const severityFromConfidence = (confidence: number): SeverityLevel => {
  if (confidence >= 0.9) return 'critical';
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
};

const buildChrome = ({
  reportId,
  runId,
  huntResult,
  behavior,
  events,
  alerts,
  tier1RefCount,
}: {
  reportId: string;
  runId: string;
  huntResult: SseHuntResult;
  behavior?: CoordinatorBehavior;
  events: SseEventRef[];
  alerts: SseAlertRef[];
  /** Tier 1 refs this entry carries, which is not the report's Tier 1 total. */
  tier1RefCount: number;
}): Pick<
  SseAttachmentData,
  | 'title'
  | 'severity'
  | 'confidence'
  | 'status'
  | 'timeline'
  | 'hypothesis_tested'
  | 'evidence_for'
  | 'evidence_against'
  | 'evaluation_record_ref'
> => {
  const title = behavior?.title
    ? behavior.title.slice(0, 512)
    : huntResult.has_confirmed_hit
    ? `Hunt confirmed for ${reportId}`.slice(0, 512)
    : `Hunt complete for ${reportId}`.slice(0, 512);

  const confidence = behavior?.confidence ?? (huntResult.has_confirmed_hit ? 0.7 : 0.3);
  const severity: SeverityLevel = behavior?.severity
    ? behavior.severity
    : severityFromConfidence(confidence);

  const hypothesisTested = (
    behavior?.evidence_quote ||
    behavior?.title ||
    `Hunt Watch evaluated report ${reportId} against the environment.`
  ).slice(0, 4000);

  const evidenceFor: string[] = [];
  if (huntResult.hit_sources.includes('tier1')) {
    // Two things this sentence must not overstate. `counts.total_hits` spans required and
    // optional indices, while only a required-index match sets the hit bar, so the total is
    // "matched", not "confirmed" — one required event beside 99 optional alerts would
    // otherwise read as 100 confirmed hits. And the total is the report's, not this
    // technique's, so a technique-scoped entry says whose count it quotes and how much of
    // it it carries. `per_index` holds the required/optional split either way.
    evidenceFor.push(
      behavior
        ? `Tier 1 matched ${huntResult.tier1.counts.total_hits} event(s) for this report in the hunt window, at least one in a required index; ${tier1RefCount} are referenced here (see hunt_result.tier1.per_index for the required/optional split).`
        : `Tier 1 matched ${huntResult.tier1.counts.total_hits} event(s) in the hunt window, at least one in a required index (see hunt_result.tier1.per_index for the required/optional split).`
    );
  }
  if (huntResult.hit_sources.includes('tier2') && behavior?.execution?.hit) {
    evidenceFor.push(
      `Tier 2 executed ${behavior.technique_id} with ${behavior.execution.row_count} required-index row(s).`
    );
  }
  if (evidenceFor.length === 0 && huntResult.has_confirmed_hit) {
    evidenceFor.push('Environment hit confirmed; see hunt_result for structured detail.');
  }

  // The report-scoped entry carries every proposed behavior, including the ones that executed
  // and found nothing. Naming them is the difference between "not investigated" and
  // "investigated and absent" — but only for an execution that reached a verdict. Tier 2 also
  // reports `hit: false` for rows it could not evaluate against the required indices, and
  // calling that clean would turn "could not tell" into evidence of a clean environment.
  const evidenceAgainst: string[] = [];
  const executed = behavior
    ? []
    : (huntResult.tier2?.behaviors ?? []).filter(
        (proposed) => proposed.execution?.executed === true && proposed.execution.hit !== true
      );
  // An execution that reached no verdict belongs in neither array: it is not evidence for the
  // event and not evidence against it. `execution.inconclusive_reason` carries it instead, so
  // the fact survives without either array making a claim the run did not earn.
  const executedClean = executed.filter(
    (proposed) => proposed.execution?.inconclusive_reason === undefined
  );
  if (executedClean.length > 0) {
    evidenceAgainst.push(
      `Tier 2 executed ${
        executedClean.length
      } proposed technique(s) with no required-index rows: ${executedClean
        .map((proposed) => proposed.technique_id)
        .join(', ')}.`.slice(0, 2000)
    );
  }
  const timeline: SseAttachmentData['timeline'] = [];
  for (const event of events) {
    if (timeline.length >= MAX_TIMELINE) break;
    if (!event.timestamp) continue;
    timeline.push({
      at: event.timestamp,
      what: `Event ${event.event_id} in ${event.source_index}`.slice(0, 2000),
    });
  }
  for (const alert of alerts) {
    if (timeline.length >= MAX_TIMELINE) break;
    if (!alert.timestamp) continue;
    timeline.push({
      at: alert.timestamp,
      what: `Alert ${alert.alert_id} in ${alert.index}`.slice(0, 2000),
    });
  }

  const evalRef = `eval:hunt:${reportId}:${runId}`.slice(0, 512);

  return {
    title,
    severity,
    confidence,
    status: 'open',
    timeline,
    hypothesis_tested: hypothesisTested,
    evidence_for: evidenceFor.slice(0, MAX_EVIDENCE),
    evidence_against: evidenceAgainst.slice(0, MAX_EVIDENCE),
    evaluation_record_ref: evalRef,
  };
};

/**
 * Whether this run corroborated the technique itself, which is what earns it an
 * SSE of its own: its ES|QL executed and returned required-index rows, or a
 * Tier 1 hit in a required index was attributed to it. A Tier 1 hit with no
 * `matched.technique_id` is shared context for every technique, so it cannot
 * single one out — counting it would publish an open, rule-named finding for
 * every behavior the model proposed as soon as Tier 1 found anything at all.
 */
const isCorroborated = (result: HuntCoordinatorCoreResult, techniqueId: string): boolean => {
  const behaviors = result.tier2?.behaviors ?? [];
  if (
    behaviors.some(
      (behavior) => behavior.technique_id === techniqueId && behavior.execution?.hit === true
    )
  ) {
    return true;
  }
  // `tier1.has_confirmed_hit` is a report-wide boolean counted over the required patterns
  // alone, while `hits` samples required and optional indices together. So the hit that set
  // the boolean and the hit attributed to this technique need not be the same one: without
  // the per-index check, an alert from an optional index plus an unrelated required-index
  // IOC match would promote a technique that never met the hit bar.
  return (
    result.tier1.has_confirmed_hit &&
    result.tier1.hits.some(
      (hit) =>
        hit.matched?.technique_id?.toUpperCase() === techniqueId.toUpperCase() &&
        isRequiredIndex(result, hit.index)
    )
  );
};

const buildEntry = ({
  result,
  reportId,
  spaceId,
  techniqueId,
  forceNow,
}: {
  result: HuntCoordinatorCoreResult;
  reportId: string;
  spaceId: string;
  techniqueId?: string;
  /**
   * The run's clock, for both window bounds, matching `assertHuntWindow`.
   * Document timestamps are absolute instants and do not use it.
   */
  forceNow: Date;
}): SseEntry => {
  const { events, alerts, tier1RefCount } = mergeTierHitRefs({
    result,
    onlyTechniqueId: techniqueId,
  });
  const { entities, truncated, originalCount } = buildEntities(result, techniqueId);
  const huntResult = buildHuntResult(result, {
    onlyTechniqueId: techniqueId,
    tier1RefCount,
    forceNow,
  });
  const behavior = techniqueId
    ? result.tier2?.behaviors.find((b) => b.technique_id === techniqueId)
    : undefined;
  const chrome = buildChrome({
    reportId,
    runId: result.run_id,
    huntResult,
    behavior,
    events,
    alerts,
    tier1RefCount,
  });

  return {
    attachment_id: buildSseAttachmentId({ spaceId, reportId, techniqueId }),
    data: {
      ...chrome,
      source_watch: SOURCE_WATCH_MANAGED_ID,
      capability: CAPABILITY_ID,
      run_id: result.run_id,
      report_id: reportId,
      security_knowledge_indicators: buildSecurityKnowledgeIndicators(result, techniqueId),
      entities,
      alerts,
      events,
      hunt_result: huntResult,
      ...(truncated ? { truncated: true, truncated_original_count: originalCount } : {}),
    },
  };
};

/**
 * Pure function: coordinator output in, one SSE entry per corroborated
 * technique out. No I/O, no ES calls. The hunt child workflow's step calls this
 * after `hunt_coordinator` returns and fans out over the result with
 * `ai.attachment.add`, one call per entry.
 *
 * A technique the run only *proposed* gets no entry of its own: an SSE is a
 * finding, and publishing one per proposal would open a rule-named,
 * model-severity event for every behavior Tier 2 guessed at. When no technique
 * is corroborated the single report-scoped entry carries all of them in
 * `hunt_result.tier2.behaviors`, with the executed-and-clean ones named in
 * `evidence_against`. When some are, the uncorroborated proposals are left to
 * the coordinator response, which is where a caller that wants every proposal
 * should read them.
 *
 * Each technique-scoped entry's `security_knowledge_indicators`,
 * `hunt_result.tier2.behaviors`, Tier 2 `hits`, and Tier 2 entities are
 * filtered to that technique. Tier 1 events attributed to another technique
 * are excluded; IOC-only / unscoped Tier 1 hits stay shared.
 */
export const buildSseData = (
  result: HuntCoordinatorCoreResult,
  reportId: string,
  options: SseMapperOptions
): SseEntry[] => {
  // One clock for the whole run, so sibling entries from a single hunt cannot
  // disagree about the window they report.
  const forceNow = new Date();
  const corroborated = [
    ...new Set(
      (result.tier2?.behaviors ?? [])
        .map((behavior) => behavior.technique_id)
        .filter((techniqueId) => isCorroborated(result, techniqueId))
    ),
  ];

  if (corroborated.length === 0) {
    return [buildEntry({ result, reportId, spaceId: options.spaceId, forceNow })];
  }

  return corroborated.map((techniqueId) =>
    buildEntry({ result, reportId, spaceId: options.spaceId, techniqueId, forceNow })
  );
};
