/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import net from 'node:net';
import type { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import {
  TaskCost,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
  type RunContext,
  throwRetryableError,
} from '@kbn/task-manager-plugin/server';
import {
  GLOBAL_SPACE_ID,
  INDICATOR_REFERENCE_PREFIX,
  IOC_TYPES,
  type IocType,
  THREAT_INTEL_INDICATORS_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common/threat_intel';
import { HIDDEN_INDEX_SEARCH_OPTIONS } from '../lib/es_options';
import { isTransientEsStatus } from '../lib/es_retry';
import { normalizeProvenanceUrl } from '../services/provenance_url';

export const PROMOTE_THREAT_INDICATORS_TASK_TYPE = 'threat_intel:promote_threat_indicators';
export const PROMOTE_THREAT_INDICATORS_TASK_ID = 'threat_intel:promote_threat_indicators:default';
const DEFAULT_INTERVAL = '15m';
const LOOKBACK_ON_FIRST_RUN = 'now-30d';
const PAGE_SIZE = 200;
/** Indicator upserts per bulk request (two bulk lines per op). Keeps memory and request size bounded. */
const BULK_OPS_CHUNK_SIZE = 250;
const TASK_TIMEOUT = '2m';

/**
 * Tie-breaker for `search_after`. `_shard_doc` is only available inside a
 * point-in-time, which is why the scan opens one: without a PIT the previous
 * `_doc` tie-breaker was neither stable across refreshes and segment merges nor
 * globally unique across the shards matched by the wildcard. Enrichment writes
 * concurrently with this scan, so reports sharing an `extracted_at` value could
 * move across a page boundary and be skipped — and since only the timestamp is
 * persisted, a skipped report was never picked up by a later run.
 */
const REPORT_SCAN_SORT: estypes.Sort = [
  { 'lineage.extracted_at': { order: 'asc' } },
  { _shard_doc: { order: 'asc' } },
];

/** Long enough to outlive the task timeout, so the PIT survives the whole scan. */
const PIT_KEEP_ALIVE = '3m';

/** `extracted.iocs` is `nested` in the reports mapping; `exists` on the parent path matches nothing. */
const HAS_EXTRACTED_IOCS_FILTER: estypes.QueryDslQueryContainer = {
  nested: {
    path: 'extracted.iocs',
    query: {
      exists: { field: 'extracted.iocs.value' },
    },
  },
};

const stateSchemaV1 = schema.object({
  /**
   * ISO-8601 timestamp of the most recent `lineage.extracted_at` value
   * processed by a prior run. Used as the lower bound of the next run's
   * query so the task only re-syncs newly enriched reports.
   */
  lastSyncedAt: schema.maybe(schema.string()),
  /**
   * Counters surfaced through Task Manager's task SO for monitoring. Not
   * required for correctness — the next run derives everything from
   * `lastSyncedAt` + the index contents.
   */
  totalReportsProcessed: schema.maybe(schema.number()),
  totalIndicatorsWritten: schema.maybe(schema.number()),
});

/**
 * v2 adds `totalIndicatorsRejected`. Permanently-rejected indicators are dropped
 * so the checkpoint can advance (see `classifyBulkFailure`), and a drop that only
 * exists in a log line is a drop nobody notices. This counter is the standing
 * signal that the index is missing rows.
 *
 * Never edit a published version in place; add the next one. See
 * https://github.com/elastic/kibana/issues/155764.
 */
const stateSchemaV2 = schema.object({
  lastSyncedAt: schema.maybe(schema.string()),
  totalReportsProcessed: schema.maybe(schema.number()),
  totalIndicatorsWritten: schema.maybe(schema.number()),
  totalIndicatorsRejected: schema.maybe(schema.number()),
});

/**
 * Task state shape. The index signature is required because Task Manager's
 * `RunResult.state` is typed as `Record<string, unknown>` — without it the
 * concrete state fields below are not structurally assignable. The named
 * properties still drive autocomplete and type-checking within this file.
 */
interface PromoteThreatIndicatorsState {
  [key: string]: unknown;
  lastSyncedAt?: string;
  totalReportsProcessed?: number;
  totalIndicatorsWritten?: number;
  totalIndicatorsRejected?: number;
}

interface ReportHit {
  _id: string;
  /** Present when the search request includes `sort`; used for `search_after`. */
  sort?: Array<string | number | null>;
  _source?: {
    '@timestamp'?: string;
    space_id?: string;
    source?: { name?: string; url?: string };
    content?: { title?: string };
    severity?: { level?: string };
    extracted?: {
      iocs?: Array<{ type?: string; value?: string; reference?: string; tier?: string }>;
    };
    lineage?: { extracted_at?: string };
  };
}

/**
 * One entry in the sources[] accumulator. Dedup key is report_id — re-running
 * the sync for the same report must not duplicate the entry.
 */
interface SourceEntry {
  report_id: string;
  provider: string;
  trail?: string;
  reference?: string;
  first_seen: string;
}

interface IocIndicatorOp {
  _index: typeof THREAT_INTEL_INDICATORS_INDEX;
  _id: string;
  /** Full initial document for the upsert (first-time-seen path). */
  upsert: Record<string, unknown>;
  /** Params forwarded into the Painless script. */
  scriptParams: {
    report_id: string;
    provider: string;
    trail: string | null;
    reference: string | null;
    first_seen: string;
    now: string;
    max_sources: number;
    severity: string | null;
    ioc_tier: string;
  };
}

/**
 * Ceiling on the sources[] provenance array. `sources` is `nested`, capped at
 * 10,000 entries by `index.mapping.nested_objects.limit`; crossing it makes
 * every later scripted update to the document fail permanently, which used
 * to stall the sync checkpoint. 1000 leaves an order of magnitude of headroom.
 */
const MAX_SOURCE_CITATIONS = 1000;

/**
 * Tiers that reach the Indicator Match index. The index holds every
 * *candidate* indicator labelled by tier, and consumers filter on `ioc_tier`
 * for the precision they need (a hunt query wants recall, a blocking rule
 * wants precision) — so `uncertain` is stored rather than dropped.
 *
 * `reference` and `denied` stay out: those are values `extract_iocs` already
 * judged not to be indicators (citation URLs, private/reserved addresses,
 * vendor domains, the benign denylist), not low-confidence candidates.
 * Untiered IOCs are excluded too, since nothing can filter on a missing
 * `ioc_tier`. The per-space, tier-filtered alias is the read-side
 * enforcement — consumers must use it, not the raw backing index.
 *
 * Ordered ascending by precision: the membership gate and the Painless rank
 * map in `SOURCES_UPSERT_SCRIPT` are both derived from this one list, so a
 * tier cannot be admitted by one and left unranked by the other.
 */
const PROMOTABLE_TIERS_BY_PRECISION = ['uncertain', 'contextual', 'discriminating'] as const;

const PROMOTABLE_TIERS: ReadonlySet<string> = new Set(PROMOTABLE_TIERS_BY_PRECISION);

const isPromotableTier = (tier: unknown): tier is string =>
  typeof tier === 'string' && PROMOTABLE_TIERS.has(tier);

/** Painless map literal, e.g. `'uncertain': 1, 'contextual': 2, ...`. */
const PROMOTABLE_TIER_RANK_LITERAL = PROMOTABLE_TIERS_BY_PRECISION.map(
  (tier, index) => `'${tier}': ${index + 1}`
).join(', ');

/**
 * Painless script that appends a sources[] entry for a citing report, deduped by
 * report_id. Also refreshes threat.indicator.last_seen and @timestamp to `now`.
 *
 * Params (passed via `params` — never interpolated into the script body):
 *   report_id  — dedup key
 *   provider   — source.name of the citing report
 *   trail      — Maltrail trail label (content.title), null for non-maltrail
 *   reference  — per-IOC nearest-ref URL (or source.url), null when absent
 *   first_seen — lineage.extracted_at of the citing report
 *   now        — wall-clock ISO string at the time of the bulk call
 *   max_sources — MAX_SOURCE_CITATIONS, the point at which provenance stops growing
 *   severity   — severity.level of the citing report, or null
 *   ioc_tier   — the extract_iocs tier this citation assigned the value
 *
 * `severity` and `ioc_tier` are both refreshed best-wins, and both have to be,
 * because the `upsert` document is ignored on an update. `ioc_tier` in particular
 * is the read-side filter on the per-space alias, so leaving it frozen at its
 * first-seen value kept a value first cited as `uncertain` out of the precision
 * alias no matter how many later reports called it `discriminating`.
 *
 * `source_report_id`, `source_report_url`, and `threat.indicator.reference` are
 * deliberately left at their first-seen values. They pair with `first_seen`, and
 * `sources[]` is the authoritative citation list (the mapping calls them legacy
 * single-source fields for exactly this reason), so rewriting them on every
 * citation would make the alert-to-report join point at an arbitrary report rather
 * than a stable one.
 */
const SOURCES_UPSERT_SCRIPT = `
if (ctx._source.sources == null) {
  ctx._source.sources = [];
}
boolean alreadyPresent = false;
for (def entry : ctx._source.sources) {
  if (entry.report_id == params.report_id) {
    alreadyPresent = true;
    break;
  }
}
if (!alreadyPresent) {
  if (ctx._source.sources.size() >= params.max_sources) {
    // At the cap: keep the existing provenance and record that there is more of
    // it than the document holds, so the truncation is not silent. last_seen
    // below still refreshes, which is the part consumers rely on.
    ctx._source.sources_truncated = true;
  } else {
    def newEntry = ['report_id': params.report_id, 'provider': params.provider, 'first_seen': params.first_seen];
    if (params.trail != null) { newEntry['trail'] = params.trail; }
    if (params.reference != null) { newEntry['reference'] = params.reference; }
    ctx._source.sources.add(newEntry);
  }
}
if (ctx._source.threat == null) { ctx._source.threat = ['indicator': [:]]; }
if (ctx._source.threat.indicator == null) { ctx._source.threat.indicator = [:]; }
ctx._source.threat.indicator.last_seen = params.now;
ctx._source['@timestamp'] = params.now;
if (params.severity != null) {
  Map rank = ['low': 1, 'medium': 2, 'high': 3, 'critical': 4];
  int incoming = rank.containsKey(params.severity) ? rank[params.severity] : 0;
  int current = ctx._source.severity != null && rank.containsKey(ctx._source.severity)
    ? rank[ctx._source.severity]
    : 0;
  if (incoming > current) {
    ctx._source.severity = params.severity;
    ctx._source.threat.indicator.confidence = params.severity;
  }
}
if (params.ioc_tier != null) {
  Map tierRank = [${PROMOTABLE_TIER_RANK_LITERAL}];
  int incomingTier = tierRank.containsKey(params.ioc_tier) ? tierRank[params.ioc_tier] : 0;
  int currentTier = ctx._source.ioc_tier != null && tierRank.containsKey(ctx._source.ioc_tier)
    ? tierRank[ctx._source.ioc_tier]
    : 0;
  if (incomingTier > currentTier) {
    ctx._source.ioc_tier = params.ioc_tier;
  }
}
`.trim();

const isIocType = (value: unknown): value is IocType =>
  typeof value === 'string' && (IOC_TYPES as readonly string[]).includes(value);

/** Elasticsearch rejects a document id longer than this. */
const MAX_DOC_ID_BYTES = 512;

/**
 * Case folding is per type because it is not uniformly safe. Domains, emails,
 * hashes, and IP literals are case-insensitive, so folding collapses real
 * duplicates. URLs and Base58 wallet addresses are case-sensitive, so folding
 * them would collide two distinct indicators onto one id and drop the
 * second's value (the scripted update only appends provenance). `new URL()`
 * lowercases scheme and host while preserving the rest, which is the split we want.
 */
const canonicalIndicatorValue = (type: IocType, value: string): string => {
  if (type === 'wallet') return value;
  if (type === 'url') {
    try {
      return new URL(value).toString();
    } catch {
      return value;
    }
  }
  return value.toLowerCase();
};

/**
 * Stable id per IOC per space (`<space_id>:<type>:<canonical_value>`) so
 * re-running the task is idempotent and `sources[]` never merges across
 * space boundaries — the promote scan runs as the internal user over every
 * space's reports, so this prefix is what enforces that isolation. Space ids
 * cannot contain `:`, so the prefix parses cleanly.
 *
 * Over 512 bytes (Elasticsearch's id limit — URL indicators can run to the
 * full report body length) the readable form is replaced by a hash of the
 * canonical value; short values keep their readable id unchanged, so this
 * only affects ids that could never have been written in the first place.
 */
const indicatorId = (spaceId: string, type: IocType, value: string): string => {
  const canonical = canonicalIndicatorValue(type, value);
  const readable = `${spaceId}:${type}:${canonical}`;
  if (Buffer.byteLength(readable, 'utf8') <= MAX_DOC_ID_BYTES) return readable;
  return `${spaceId}:${type}:${createHash('sha256').update(canonical).digest('hex')}`;
};

/**
 * Last gate before the bulk. `threat.indicator.ip` is an `ip` field, so a value
 * that is not an address is a mapping error rather than a merely bad row, and an
 * item-level mapping error is permanent: it recurs on every run. Upstream
 * parsers should have validated already, but a malformed value from any one feed
 * must not be able to cost the whole index its writes.
 */
const isWellFormedForType = (type: IocType, value: string): boolean =>
  type === 'ip' ? net.isIP(value) !== 0 : true;

/**
 * Maps an IOC into the ECS `threat.indicator.*` shape Detection Engine's
 * Indicator Match rule type expects. Only one of `ip` / `url.full` /
 * `file.hash.sha*` / `url.domain` is populated per row depending on the
 * IOC type — Indicator Match queries the populated path.
 */
const ecsIndicatorPayload = (type: IocType, rawValue: string): Record<string, unknown> => {
  if (type === 'ip') {
    // The extractor emits both address families under the same `ip` type. Filing
    // IPv6 as `ipv4-addr` breaks consumers that filter by address family.
    return { type: net.isIPv6(rawValue) ? 'ipv6-addr' : 'ipv4-addr', ip: rawValue };
  }
  if (type === 'url') {
    let domain: string | undefined;
    try {
      domain = new URL(rawValue).hostname || undefined;
    } catch {
      domain = undefined;
    }
    return {
      type: 'url',
      url: { full: rawValue, ...(domain ? { domain } : {}) },
    };
  }
  if (type === 'domain') {
    return { type: 'domain-name', url: { domain: rawValue } };
  }
  if (type === 'email') {
    return { type: 'email-addr', email: rawValue };
  }
  if (type === 'cidr') {
    return { type: 'network', network: { cidr: rawValue } };
  }
  if (type === 'wallet') {
    return { type: 'cryptocurrency-addr', cryptocurrency: { address: rawValue } };
  }
  // Hashes are split by length: 32=md5, 40=sha1, 64=sha256, 128=sha512.
  // Filing sha512 under `sha256` would make it unmatchable.
  const len = rawValue.length;
  const hashField = len === 32 ? 'md5' : len === 40 ? 'sha1' : len === 128 ? 'sha512' : 'sha256';
  return { type: 'file', file: { hash: { [hashField]: rawValue.toLowerCase() } } };
};

const buildBulkOps = (reports: ReportHit[], now: string): IocIndicatorOp[] => {
  const ops: IocIndicatorOp[] = [];
  for (const report of reports) {
    const reportId = report._id;
    // Reports carry space_id (seeded/global rows use GLOBAL_SPACE_ID). It scopes
    // the indicator _id below so a value cited in two spaces never collapses into
    // one cross-space doc.
    const spaceId = report._source?.space_id ?? GLOBAL_SPACE_ID;
    const iocs = report._source?.extracted?.iocs ?? [];
    const provider = report._source?.source?.name ?? 'unknown';
    const reportUrl = normalizeProvenanceUrl(report._source?.source?.url);
    const severity = report._source?.severity?.level;
    const trailLabel = report._source?.content?.title ?? null;
    const firstSeen = report._source?.lineage?.extracted_at ?? now;

    // Two filters. The type/value check is defensive on the indexer boundary so
    // a single malformed row never poisons the bulk write. The tier check is the
    // vetting gate: only IOCs the extractor did not already classify as noise
    // become live Indicator Match rows.
    const usableIocs = iocs.filter(
      (ioc): ioc is typeof ioc & { type: IocType; value: string; tier: string } =>
        typeof ioc.value === 'string' &&
        ioc.value.length > 0 &&
        isIocType(ioc.type) &&
        isWellFormedForType(ioc.type, ioc.value) &&
        isPromotableTier(ioc.tier)
    );
    for (const ioc of usableIocs) {
      const id = indicatorId(spaceId, ioc.type, ioc.value);
      // Prefer a per-IOC reference when present, then fall back to the report's
      // provenance URL. Both pass through the same sanitizer.
      const reference = normalizeProvenanceUrl(ioc.reference) ?? reportUrl ?? null;

      const sourceEntry: SourceEntry = {
        report_id: reportId,
        provider,
        first_seen: firstSeen,
        ...(trailLabel !== null ? { trail: trailLabel } : {}),
        ...(reference !== null ? { reference } : {}),
      };

      ops.push({
        _index: THREAT_INTEL_INDICATORS_INDEX,
        _id: id,
        upsert: {
          '@timestamp': now,
          threat: {
            indicator: {
              ...ecsIndicatorPayload(ioc.type, ioc.value),
              provider,
              // Alert-to-report join key via threat.indicator.reference on alerts.
              reference: `${INDICATOR_REFERENCE_PREFIX}${reportId}`,
              first_seen: firstSeen,
              last_seen: now,
              ...(severity ? { confidence: severity } : {}),
            },
          },
          sources: [sourceEntry],
          space_id: spaceId,
          source_report_id: reportId,
          ...(reportUrl ? { source_report_url: reportUrl } : {}),
          ...(severity ? { severity } : {}),
          // Always present: `isPromotableTier` rejects untiered IOCs, so every row
          // in this index carries the label consumers filter on.
          ioc_tier: ioc.tier,
        },
        scriptParams: {
          report_id: reportId,
          provider,
          trail: trailLabel,
          reference,
          first_seen: firstSeen,
          now,
          max_sources: MAX_SOURCE_CITATIONS,
          severity: severity ?? null,
          ioc_tier: ioc.tier,
        },
      });
    }
  }
  return ops;
};

/** Exported for unit tests only — not part of the public plugin API. */
export const buildBulkOpsForTest = buildBulkOps;

/**
 * Exported for unit tests only. The Painless body cannot be executed without a
 * real cluster, so the suite guards that the fields it is supposed to touch are
 * still referenced. The max-severity semantics themselves need integration
 * coverage.
 */
export const SOURCES_UPSERT_SCRIPT_FOR_TEST = SOURCES_UPSERT_SCRIPT;

/** Error types worth waiting out, alongside `TRANSIENT_ES_STATUSES`. */
const RETRYABLE_BULK_ERROR_TYPES: ReadonlySet<string> = new Set([
  'es_rejected_execution_exception',
  'circuit_breaking_exception',
  'cluster_block_exception',
  'unavailable_shards_exception',
  'no_shard_available_action_exception',
  'process_cluster_event_timeout_exception',
]);

/**
 * Splits an item-level bulk failure into "try again later" (holds the sync
 * checkpoint so the next run re-scans the range) vs. "this will never work"
 * (a too-long id, a mapping conflict, a nested-objects-limit doc — counted
 * and logged instead, since retrying holds the checkpoint and stalls
 * promotion for every space forever). Unrecognised errors default to
 * permanent: treating a genuinely transient one as permanent costs one batch
 * of indicators, but treating a permanent one as retryable costs the whole
 * index indefinitely.
 */
const isRetryableBulkFailure = (item: estypes.BulkResponseItem | undefined): boolean => {
  if (!item) return false;
  if (isTransientEsStatus(item.status)) return true;
  const type = item.error?.type;
  return typeof type === 'string' && RETRYABLE_BULK_ERROR_TYPES.has(type);
};

/**
 * Fails a run in the only way that is safe for a *recurring* task.
 *
 * Deliberately never `throwUnrecoverableError`. Task Manager's
 * `rescheduleFailedRun` checks `isUnrecoverableError` before it looks at the
 * schedule, so `processResultForRecurringTask` then *deletes the task saved
 * object* rather than rescheduling it (see its own test, "doesn't reschedule
 * recurring tasks that throw an unrecoverable error"). This task is only ever
 * scheduled from `startThreatIntel`, so deleting it stops promotion for every
 * space until Kibana restarts. Every other caller of that helper in the repo is
 * a one-shot task where deletion is the intent.
 *
 * A transient status earns a retry sooner than the next scheduled run.
 * Everything else falls through to a plain throw, which Task Manager logs and
 * then reschedules on the normal interval. That branch is also where every
 * transport-level failure lands, because `ConnectionError`, `TimeoutError`, and
 * `RequestAbortedError` carry no `statusCode` at all — only `ResponseError`
 * does.
 *
 * Typed on the binding rather than the arrow so that control flow analysis
 * treats a call as unreachable-after; on the arrow alone the callers below
 * still look like they can fall through with `pitId` unassigned.
 */
const throwForNextRun: (context: string, err: unknown) => never = (context, err) => {
  const message = (err as Error).message ?? String(err);
  if (isTransientEsStatus((err as { statusCode?: number }).statusCode)) {
    throwRetryableError(new Error(`${context}: ${message}`), new Date(Date.now() + 60_000));
  }
  throw new Error(`${context}: ${message}`);
};

interface BulkUpdateAction {
  update: { _index: string; _id: string };
}
interface BulkScriptedUpsert {
  script: { source: string; lang: 'painless'; params: Record<string, unknown> };
  upsert: Record<string, unknown>;
}

export const registerPromoteThreatIndicatorsTask = ({
  taskManager,
  coreSetup,
  logger,
  getReconcileAttributeWorkflows,
}: {
  taskManager: TaskManagerSetupContract;
  /**
   * `CoreSetup` is intentionally unparameterized — the task body only uses
   * `coreSetup.getStartServices()` to acquire `coreStart.elasticsearch` and
   * never consumes plugin start contracts, so the start-dependencies type
   * does not need to flow through here. Keeping it generic also lets the
   * caller pass any plugin's `CoreSetup` without contract coupling, which
   * matters when the task is wired from `securitySolution`'s plugin (whose
   * start-deps shape differs from the original standalone plugin's).
   */
  coreSetup: CoreSetup;
  logger: Logger;
  /**
   * Installs `attribute_alerts_to_reports` into any space missing it. Bound in
   * setup to a runtime slot that start fills when the supply flag is on.
   */
  getReconcileAttributeWorkflows: () => Promise<void>;
}): void => {
  taskManager.registerTaskDefinitions({
    [PROMOTE_THREAT_INDICATORS_TASK_TYPE]: {
      title: 'Threat Intelligence — Promote threat indicators',
      description:
        `Mirror newly extracted IOCs from ${THREAT_REPORTS_INDEX_PATTERN} into ` +
        `${THREAT_INTEL_INDICATORS_INDEX} so Detection Engine Indicator Match rules ` +
        'can match them against alert/event data without a parallel matcher.',
      timeout: TASK_TIMEOUT,
      // One-shot semantics per scheduled run — re-running on transient
      // failure could write a `last_seen` that lags behind. The next
      // scheduled run will catch up via `lastSyncedAt` anyway.
      maxAttempts: 1,
      cost: TaskCost.Normal,
      stateSchemaByVersion: {
        1: { schema: stateSchemaV1, up: (s) => s },
        2: {
          schema: stateSchemaV2,
          up: (s) => ({ ...s, totalIndicatorsRejected: s.totalIndicatorsRejected ?? 0 }),
        },
      },
      createTaskRunner: ({ taskInstance, signal }: RunContext) => ({
        run: async () => {
          // Catch spaces created after boot before scanning reports. Failures
          // here must not block promotion — install is idempotent and the next
          // 15m pass will retry.
          await getReconcileAttributeWorkflows().catch((err: Error) => {
            logger.warn(
              `Failed to reconcile per-space attribute workflows before promote: ${err.message}`
            );
          });

          const previousState = (taskInstance.state ?? {}) as PromoteThreatIndicatorsState;
          const lower = previousState.lastSyncedAt ?? LOOKBACK_ON_FIRST_RUN;

          const [coreStart] = await coreSetup.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const now = new Date().toISOString();

          let reportsProcessed = 0;
          let indicatorsWritten = 0;
          let searchAfter: Array<string | number | null> | undefined;
          let latestExtractedAt = previousState.lastSyncedAt;
          // Only advance the cursor when the scan drained the backlog. A
          // completed scan that stored a mid-batch tick used to skip remaining
          // siblings: `text_indicator_list` stamps one `lineage.extracted_at`
          // across every chunk of a large list (5_000 nested objects), so `gt`
          // on that tick dropped the rest. Writes are idempotent (stable `_id`
          // + report_id dedupe), so the range is `gte` and re-scanning the
          // handful of boundary-timestamp docs every 15m is cheap. Enrich is
          // not this writer — each persist_extractions gets its own `now`.
          let scanCompleted = false;
          // Only a *transient* item-level rejection holds the checkpoint. The
          // next run re-scans the range and the write lands, and since writes are
          // idempotent re-scanning is cheap. A permanent rejection is counted and
          // logged instead: it would fail identically forever, so holding the
          // cursor for it stops promotion for every space rather than saving
          // anything. See `isRetryableBulkFailure`.
          let hadRetryableWriteFailures = false;
          let indicatorsRejected = 0;
          // Set when the task timeout aborts an in-flight bulk, so the break can
          // carry out through the chunk loop as well as the page loop.
          let abortedMidRun = false;

          // A point-in-time freezes the view for the whole scan, which is what
          // makes `search_after` stable while enrichment writes concurrently,
          // and is what allows the `_shard_doc` tie-breaker.
          let pitId: string;
          try {
            const pit = await esClient.openPointInTime({
              index: THREAT_REPORTS_INDEX_PATTERN,
              keep_alive: PIT_KEEP_ALIVE,
              // Reports live in a hidden index, which a wildcard skips by default.
              ...HIDDEN_INDEX_SEARCH_OPTIONS,
            });
            pitId = pit.id;
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 404) {
              // Reports index not created yet (first plugin start race).
              // Treat as no-op and let the next scheduled run pick up.
              return { state: previousState satisfies PromoteThreatIndicatorsState };
            }
            throwForNextRun('Failed to open a point-in-time for the report scan', err);
          }

          try {
            // Page through reports that have been (re-)enriched since the
            // last sync. The loop checks `signal.aborted` between pages so
            // timeouts surface as graceful state returns rather than write storms.
            while (!signal.aborted) {
              let searchResponse;
              try {
                searchResponse = await esClient.search<ReportHit['_source']>(
                  {
                    // `pit` replaces `index`: the point-in-time already pins the
                    // target indices and their wildcard resolution.
                    pit: { id: pitId, keep_alive: PIT_KEEP_ALIVE },
                    size: PAGE_SIZE,
                    _source: [
                      '@timestamp',
                      'space_id',
                      'source.name',
                      'source.url',
                      'content.title',
                      'severity.level',
                      'extracted.iocs',
                      'lineage.extracted_at',
                    ],
                    query: {
                      bool: {
                        filter: [
                          { range: { 'lineage.extracted_at': { gte: lower } } },
                          HAS_EXTRACTED_IOCS_FILTER,
                        ],
                      },
                    },
                    sort: REPORT_SCAN_SORT,
                    ...(searchAfter ? { search_after: searchAfter } : {}),
                  },
                  { signal }
                );
                // ES can hand back a refreshed PIT id; carry it to the next page.
                if (searchResponse.pit_id) pitId = searchResponse.pit_id;
              } catch (err) {
                // The task timeout aborts the in-flight request, which is a
                // normal stop rather than a failure: `scanCompleted` stays false
                // so the cursor holds and the next run re-scans from the same
                // checkpoint. Checking `signal.aborted` before classifying the
                // error is what keeps a timeout out of the failure paths — the
                // abort rejection carries no `statusCode` and would otherwise be
                // indistinguishable from a real one.
                if (signal.aborted) break;
                throwForNextRun('Failed to scan .kibana-threat-reports for IOC sync', err);
              }

              const hits = (searchResponse?.hits?.hits ?? []) as ReportHit[];
              if (hits.length === 0) {
                scanCompleted = true;
                break;
              }

              const ops = buildBulkOps(hits, now);
              if (ops.length > 0) {
                for (
                  let chunkStart = 0;
                  chunkStart < ops.length;
                  chunkStart += BULK_OPS_CHUNK_SIZE
                ) {
                  const chunk = ops.slice(chunkStart, chunkStart + BULK_OPS_CHUNK_SIZE);
                  const bulkBody: Array<BulkUpdateAction | BulkScriptedUpsert> = [];
                  for (const op of chunk) {
                    bulkBody.push({ update: { _index: op._index, _id: op._id } });
                    bulkBody.push({
                      script: {
                        source: SOURCES_UPSERT_SCRIPT,
                        lang: 'painless',
                        params: op.scriptParams as Record<string, unknown>,
                      },
                      upsert: op.upsert,
                    });
                  }
                  try {
                    const bulkResponse = await esClient.bulk(
                      { refresh: false, operations: bulkBody },
                      { signal }
                    );
                    if (bulkResponse.errors) {
                      const failedItems = bulkResponse.items
                        .map((item) => item.update ?? item.index ?? item.create)
                        .filter((action): action is estypes.BulkResponseItem => !!action?.error);
                      const retryable = failedItems.filter(isRetryableBulkFailure);
                      const permanent = failedItems.filter((item) => !isRetryableBulkFailure(item));

                      if (retryable.length > 0) {
                        hadRetryableWriteFailures = true;
                        logger.error(
                          `IOC indicator bulk hit ${retryable.length} transient rejection(s) of ` +
                            `${chunk.length} operations. Holding the sync checkpoint so the next run ` +
                            `re-scans this range (first error: ${JSON.stringify(
                              retryable[0].error ?? {}
                            )})`
                        );
                      }

                      if (permanent.length > 0) {
                        indicatorsRejected += permanent.length;
                        logger.error(
                          `IOC indicator bulk permanently rejected ${permanent.length} of ` +
                            `${chunk.length} operations. These indicators are not searchable by ` +
                            `Indicator Match rules and are being skipped so the sync checkpoint can ` +
                            `advance: retrying them would fail the same way and stall promotion for ` +
                            `every space. Ids: ${permanent
                              .map((item) => item._id)
                              .slice(0, 10)
                              .join(', ')}${permanent.length > 10 ? ', …' : ''} ` +
                            `(first error: ${JSON.stringify(permanent[0].error ?? {})})`
                        );
                      }

                      indicatorsWritten += chunk.length - failedItems.length;
                    } else {
                      indicatorsWritten += chunk.length;
                    }
                  } catch (err) {
                    // Same reasoning as the scan above: a timeout mid-bulk is a
                    // stop, not a failure. The flag carries the break out through
                    // the chunk loop as well as the page loop.
                    if (signal.aborted) {
                      abortedMidRun = true;
                      break;
                    }
                    throwForNextRun(`Bulk write to ${THREAT_INTEL_INDICATORS_INDEX} failed`, err);
                  }
                }
              }

              if (abortedMidRun) break;

              reportsProcessed += hits.length;
              const lastHit = hits[hits.length - 1];
              const lastExtractedAt = lastHit?._source?.lineage?.extracted_at ?? null;
              if (typeof lastExtractedAt === 'string') latestExtractedAt = lastExtractedAt;
              // search_after over [extracted_at, _shard_doc] so reports sharing an
              // extracted_at tick with the page boundary are not skipped.
              if (!lastHit?.sort) {
                throw new Error(
                  'Threat report scan returned hits without sort values — cannot paginate safely'
                );
              }
              searchAfter = lastHit.sort;

              if (hits.length < PAGE_SIZE) {
                scanCompleted = true;
                break;
              }
            }
          } finally {
            // Best effort: an orphaned PIT expires on its own after keep_alive.
            await esClient.closePointInTime({ id: pitId }).catch((err) => {
              logger.debug(`Failed to close report scan PIT: ${(err as Error).message}`);
            });
          }

          if (!scanCompleted) {
            logger.warn(
              `Promote threat indicators stopped early after ${reportsProcessed} reports / ` +
                `${indicatorsWritten} indicators. Holding the cursor at the previous checkpoint, ` +
                `so the next run re-scans from there. Repeated early stops mean the ${TASK_TIMEOUT} ` +
                `timeout is too short for the current backlog.`
            );
          }

          const nextState: PromoteThreatIndicatorsState = {
            // Writes are idempotent (stable `_id` + report_id-deduped sources[]),
            // so re-scanning is cheap compared with skipping reports. The cursor
            // moves when the scan drained the backlog and nothing failed in a way
            // that a re-scan would fix.
            lastSyncedAt:
              scanCompleted && !hadRetryableWriteFailures
                ? latestExtractedAt ?? previousState.lastSyncedAt
                : previousState.lastSyncedAt,
            totalReportsProcessed: (previousState.totalReportsProcessed ?? 0) + reportsProcessed,
            totalIndicatorsWritten: (previousState.totalIndicatorsWritten ?? 0) + indicatorsWritten,
            totalIndicatorsRejected:
              (previousState.totalIndicatorsRejected ?? 0) + indicatorsRejected,
          };

          return { state: nextState };
        },
      }),
    },
  });
};

export const schedulePromoteThreatIndicatorsTask = async ({
  taskManager,
  logger,
  interval = DEFAULT_INTERVAL,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  interval?: string;
}): Promise<void> => {
  // Preserve any operator-customized schedule across restarts: if the task
  // already exists with a non-default interval, keep it. Otherwise fall back
  // to the default interval.
  const existing = await taskManager.get(PROMOTE_THREAT_INDICATORS_TASK_ID).catch(() => undefined);
  await taskManager.ensureScheduled({
    id: PROMOTE_THREAT_INDICATORS_TASK_ID,
    taskType: PROMOTE_THREAT_INDICATORS_TASK_TYPE,
    schedule: existing?.schedule ?? { interval },
    params: existing?.params ?? {},
    state: (existing?.state ?? {}) as PromoteThreatIndicatorsState,
  });
  logger.debug(
    `Scheduled ${PROMOTE_THREAT_INDICATORS_TASK_ID} with interval=${
      existing?.schedule?.interval ?? interval
    }`
  );
};
