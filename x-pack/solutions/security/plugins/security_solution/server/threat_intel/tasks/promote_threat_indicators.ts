/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import {
  TaskCost,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
  type RunContext,
  throwRetryableError,
  throwUnrecoverableError,
} from '@kbn/task-manager-plugin/server';
import {
  GLOBAL_SPACE_ID,
  INDICATOR_REFERENCE_PREFIX,
  IOC_TYPES,
  type IocType,
  THREAT_INTEL_INDICATORS_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common/threat_intel';
import { HIDDEN_INDEX_SEARCH_OPTIONS } from '../setup/index_templates';

export const PROMOTE_THREAT_INDICATORS_TASK_TYPE = 'threat_intel:promote_threat_indicators';
export const PROMOTE_THREAT_INDICATORS_TASK_ID = 'threat_intel:promote_threat_indicators:default';
const DEFAULT_INTERVAL = '15m';
const LOOKBACK_ON_FIRST_RUN = 'now-30d';
const PAGE_SIZE = 200;
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
  };
}

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
  def newEntry = ['report_id': params.report_id, 'provider': params.provider, 'first_seen': params.first_seen];
  if (params.trail != null) { newEntry['trail'] = params.trail; }
  if (params.reference != null) { newEntry['reference'] = params.reference; }
  ctx._source.sources.add(newEntry);
}
if (ctx._source.threat == null) { ctx._source.threat = ['indicator': [:]]; }
if (ctx._source.threat.indicator == null) { ctx._source.threat.indicator = [:]; }
ctx._source.threat.indicator.last_seen = params.now;
ctx._source['@timestamp'] = params.now;
`.trim();

const isIocType = (value: unknown): value is IocType =>
  typeof value === 'string' && (IOC_TYPES as readonly string[]).includes(value);

/**
 * Tiers that must never reach the Indicator Match index.
 *
 * `extract_iocs` assigns these to values it has already judged not to be
 * indicators: `denied` is the benign/common denylist, and `reference` covers the
 * report's own citation URLs, private and reserved IPs, and security-vendor and
 * research domains. Promoting them would generate a false-positive alert every
 * time an analyst visits VirusTotal or a host talks to a private address.
 */
const NON_PROMOTABLE_TIERS: ReadonlySet<string> = new Set(['reference', 'denied']);

/**
 * An IOC with no tier predates the tiering pass, so it is promoted rather than
 * dropped. Silently withholding older intel would be worse than a stale row.
 */
const isPromotableTier = (tier: unknown): boolean =>
  typeof tier !== 'string' || !NON_PROMOTABLE_TIERS.has(tier);

/**
 * Stable id per IOC per space so re-running the task is idempotent. Keyed
 * `<space_id>:<type>:<lowercased_value>` so the same value cited by reports in
 * different spaces stays in separate docs and sources[] never merges across
 * space boundaries — the promote scan runs as the internal user over every
 * space's reports, so the space prefix is what enforces the isolation the rest
 * of the pipeline relies on. Space ids cannot contain `:`, so the prefix parses
 * cleanly (`GET /…/_doc/default:ip:1.2.3.4`).
 */
const indicatorId = (spaceId: string, type: IocType, value: string): string =>
  `${spaceId}:${type}:${value.toLowerCase()}`;

/**
 * Maps an IOC into the ECS `threat.indicator.*` shape Detection Engine's
 * Indicator Match rule type expects. Only one of `ip` / `url.full` /
 * `file.hash.sha*` / `url.domain` is populated per row depending on the
 * IOC type — Indicator Match queries the populated path.
 */
const ecsIndicatorPayload = (type: IocType, rawValue: string): Record<string, unknown> => {
  if (type === 'ip') {
    return { type: 'ipv4-addr', ip: rawValue };
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
  // hash — split by length: 32=md5, 40=sha1, 64=sha256, 128=sha512. STIX feeds
  // can carry sha512, and filing it under `sha256` would make it unmatchable.
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
    const reportUrl = report._source?.source?.url;
    const severity = report._source?.severity?.level;
    const trailLabel = report._source?.content?.title ?? null;
    const firstSeen = report._source?.lineage?.extracted_at ?? now;

    // Two filters. The type/value check is defensive on the indexer boundary so
    // a single malformed row never poisons the bulk write. The tier check is the
    // vetting gate: only IOCs the extractor did not already classify as noise
    // become live Indicator Match rows.
    const usableIocs = iocs.filter(
      (ioc): ioc is typeof ioc & { type: IocType; value: string } =>
        typeof ioc.value === 'string' &&
        ioc.value.length > 0 &&
        isIocType(ioc.type) &&
        isPromotableTier(ioc.tier)
    );
    for (const ioc of usableIocs) {
      const id = indicatorId(spaceId, ioc.type, ioc.value);
      // Per-IOC reference: use the Maltrail nearest-ref URL when present,
      // fall back to the report's source.url, absent otherwise.
      const reference = ioc.reference ?? reportUrl ?? null;

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
          // Why this row is live, for auditing the vetting gate.
          ...(typeof ioc.tier === 'string' ? { ioc_tier: ioc.tier } : {}),
        },
        scriptParams: {
          report_id: reportId,
          provider,
          trail: trailLabel,
          reference,
          first_seen: firstSeen,
          now,
        },
      });
    }
  }
  return ops;
};

/** Exported for unit tests only — not part of the public plugin API. */
export const buildBulkOpsForTest = buildBulkOps;

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
}): void => {
  taskManager.registerTaskDefinitions({
    [PROMOTE_THREAT_INDICATORS_TASK_TYPE]: {
      title: 'Threat Intelligence — Promote threat indicators',
      description:
        'Mirror newly extracted IOCs from .kibana-threat-reports-* into ' +
        '.kibana-threat-intel-indicators so Detection Engine Indicator Match rules ' +
        'can match them against alert/event data without a parallel matcher.',
      timeout: TASK_TIMEOUT,
      // One-shot semantics per scheduled run — re-running on transient
      // failure could write a `last_seen` that lags behind. The next
      // scheduled run will catch up via `lastSyncedAt` anyway.
      maxAttempts: 1,
      cost: TaskCost.Normal,
      stateSchemaByVersion: {
        1: { schema: stateSchemaV1, up: (s) => s },
      },
      createTaskRunner: ({ taskInstance, signal }: RunContext) => ({
        run: async () => {
          const previousState = (taskInstance.state ?? {}) as PromoteThreatIndicatorsState;
          const lower = previousState.lastSyncedAt ?? LOOKBACK_ON_FIRST_RUN;

          const [coreStart] = await coreSetup.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const now = new Date().toISOString();

          let reportsProcessed = 0;
          let indicatorsWritten = 0;
          let searchAfter: Array<string | number | null> | undefined;
          let latestExtractedAt = previousState.lastSyncedAt;
          // Only advance the cursor when the scan drained the backlog. Enrich
          // stamps whole batches with the same `lineage.extracted_at`, so a run
          // that stops mid-timestamp (2m timeout) would otherwise store that
          // tick and the next run's `gt` would skip every remaining report
          // sharing it.
          let scanCompleted = false;
          // Item-level bulk rejections leave indicators unwritten. Advancing the
          // cursor past them would drop those reports permanently (nothing
          // re-reads a range once `lastSyncedAt` moves), so any failure holds
          // the checkpoint and the next run re-scans the range. Writes are
          // idempotent, so re-scanning is the cheap side of this trade.
          let hadWriteFailures = false;

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
            const message = (err as Error).message ?? String(err);
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 404) {
              // Reports index not created yet (first plugin start race).
              // Treat as no-op and let the next scheduled run pick up.
              return { state: previousState satisfies PromoteThreatIndicatorsState };
            }
            if (status === 503 || status === 429) {
              throwRetryableError(
                new Error(
                  `Elasticsearch transient failure opening the report scan PIT: ${message}`
                ),
                new Date(Date.now() + 60_000)
              );
            }
            throwUnrecoverableError(
              new Error(`Failed to open a point-in-time for the report scan: ${message}`)
            );
            return { state: previousState };
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
                          { range: { 'lineage.extracted_at': { gt: lower } } },
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
                const message = (err as Error).message ?? String(err);
                // ES temporarily unavailable — retry the whole run in a minute.
                // Anything else (mapping conflict, RBAC) is permanent for this
                // run and surfaces in the next attempt.
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 503 || status === 429) {
                  throwRetryableError(
                    new Error(`Elasticsearch transient failure during report scan: ${message}`),
                    new Date(Date.now() + 60_000)
                  );
                }
                throwUnrecoverableError(
                  new Error(`Failed to scan .kibana-threat-reports for IOC sync: ${message}`)
                );
                return { state: previousState };
              }

              const hits = (searchResponse?.hits?.hits ?? []) as ReportHit[];
              if (hits.length === 0) {
                scanCompleted = true;
                break;
              }

              const ops = buildBulkOps(hits, now);
              if (ops.length > 0) {
                const bulkBody: Array<BulkUpdateAction | BulkScriptedUpsert> = [];
                for (const op of ops) {
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
                    const failedItems = bulkResponse.items.filter(
                      (item) => item.update?.error || item.index?.error || item.create?.error
                    );
                    const firstError = failedItems[0];
                    // Hold the checkpoint: those indicators are not searchable by
                    // Indicator Match rules, and advancing past them would drop
                    // them for good.
                    hadWriteFailures = true;
                    logger.error(
                      `IOC indicator bulk rejected ${failedItems.length} of ${ops.length} operations. ` +
                        `Holding the sync checkpoint so the next run re-scans this range ` +
                        `(first error: ${JSON.stringify(firstError ?? {})})`
                    );
                    indicatorsWritten += ops.length - failedItems.length;
                  } else {
                    indicatorsWritten += ops.length;
                  }
                } catch (err) {
                  const message = (err as Error).message ?? String(err);
                  throwRetryableError(
                    new Error(`Bulk write to ${THREAT_INTEL_INDICATORS_INDEX} failed: ${message}`),
                    new Date(Date.now() + 60_000)
                  );
                  return { state: previousState };
                }
              }

              reportsProcessed += hits.length;
              const lastHit = hits[hits.length - 1];
              const lastExtractedAt = lastHit?._source?.lineage?.extracted_at ?? null;
              if (typeof lastExtractedAt === 'string') latestExtractedAt = lastExtractedAt;
              // search_after over [extracted_at, _shard_doc] so reports sharing an
              // extracted_at tick with the page boundary are not skipped.
              if (!lastHit?.sort) {
                throwUnrecoverableError(
                  new Error(
                    'Threat report scan returned hits without sort values — cannot paginate safely'
                  )
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
            // only moves when the scan drained the backlog *and* every write
            // landed.
            lastSyncedAt:
              scanCompleted && !hadWriteFailures
                ? latestExtractedAt ?? previousState.lastSyncedAt
                : previousState.lastSyncedAt,
            totalReportsProcessed: (previousState.totalReportsProcessed ?? 0) + reportsProcessed,
            totalIndicatorsWritten: (previousState.totalIndicatorsWritten ?? 0) + indicatorsWritten,
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
