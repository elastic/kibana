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
  INDICATOR_REFERENCE_PREFIX,
  IOC_TYPES,
  type IocType,
  THREAT_INTEL_INDICATORS_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common/threat_intelligence/hub';

export const PROMOTE_THREAT_INDICATORS_TASK_TYPE = 'threat_intelligence:promote_threat_indicators';
export const PROMOTE_THREAT_INDICATORS_TASK_ID =
  'threat_intelligence:promote_threat_indicators:default';
const DEFAULT_INTERVAL = '15m';
const LOOKBACK_ON_FIRST_RUN = 'now-30d';
const PAGE_SIZE = 200;
const TASK_TIMEOUT = '2m';

/**
 * Tie-breaker for `search_after` without a PIT. Sorting on `_id` or `_shard_doc`
 * (without PIT) triggers fielddata on `_id` (disabled by default). `_doc` uses
 * Lucene doc order and does not require `_id` fielddata.
 */
const REPORT_SCAN_SORT: estypes.Sort = [{ 'lineage.extracted_at': { order: 'asc' } }, '_doc'];

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
    source?: { name?: string; url?: string };
    content?: { title?: string };
    severity?: { level?: string };
    extracted?: {
      iocs?: Array<{ type?: string; value?: string; reference?: string }>;
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
 * Stable id per IOC across reports so re-running the task is idempotent.
 * `<type>:<lowercased_value>` is unique within an IOC space; using the value
 * directly keeps the rows joinable from human inspection (`GET /…/_doc/ip:1.2.3.4`).
 */
const indicatorId = (type: IocType, value: string): string => `${type}:${value.toLowerCase()}`;

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
  // hash — split by length: 32=md5, 40=sha1, 64=sha256.
  const len = rawValue.length;
  const hashField = len === 32 ? 'md5' : len === 40 ? 'sha1' : 'sha256';
  return { type: 'file', file: { hash: { [hashField]: rawValue.toLowerCase() } } };
};

const buildBulkOps = (reports: ReportHit[], now: string): IocIndicatorOp[] => {
  const ops: IocIndicatorOp[] = [];
  for (const report of reports) {
    const reportId = report._id;
    const iocs = report._source?.extracted?.iocs ?? [];
    const provider = report._source?.source?.name ?? 'unknown';
    const reportUrl = report._source?.source?.url;
    const severity = report._source?.severity?.level;
    const trailLabel = report._source?.content?.title ?? null;
    const firstSeen = report._source?.lineage?.extracted_at ?? now;

    // Defensive filter: Workflow 2's extractor should not emit IOCs with
    // missing values or unknown types, but stay defensive on the indexer
    // boundary so a single malformed row never poisons the bulk write.
    const usableIocs = iocs.filter(
      (ioc): ioc is typeof ioc & { type: IocType; value: string } =>
        typeof ioc.value === 'string' && ioc.value.length > 0 && isIocType(ioc.type)
    );
    for (const ioc of usableIocs) {
      const id = indicatorId(ioc.type, ioc.value);
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
              // Workflow 4's join key. Indicator Match alerts carry this
              // through to `threat.enrichments.indicator.reference`.
              reference: `${INDICATOR_REFERENCE_PREFIX}${reportId}`,
              first_seen: firstSeen,
              last_seen: now,
              ...(severity ? { confidence: severity } : {}),
            },
          },
          sources: [sourceEntry],
          source_report_id: reportId,
          ...(reportUrl ? { source_report_url: reportUrl } : {}),
          ...(severity ? { severity } : {}),
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
      createTaskRunner: ({ taskInstance, abortController }: RunContext) => ({
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

          // Page through reports that have been (re-)enriched since the
          // last sync. `search_after` over `lineage.extracted_at` keeps
          // the cursor stable even when concurrent ingestion is writing.
          // The loop checks `signal.aborted` between pages so timeouts
          // surface as graceful state returns rather than write storms.
          while (!abortController.signal.aborted) {
            let searchResponse;
            try {
              searchResponse = await esClient.search<ReportHit['_source']>(
                {
                  index: THREAT_REPORTS_INDEX_PATTERN,
                  size: PAGE_SIZE,
                  _source: [
                    '@timestamp',
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
                { signal: abortController.signal }
              );
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
              if (status === 404) {
                // Data stream not created yet — first plugin start race.
                // Treat as no-op and let the next scheduled run pick up.
                return {
                  state: previousState satisfies PromoteThreatIndicatorsState,
                };
              }
              throwUnrecoverableError(
                new Error(`Failed to scan .kibana-threat-reports for IOC sync: ${message}`)
              );
              return { state: previousState };
            }

            const hits = (searchResponse?.hits?.hits ?? []) as ReportHit[];
            if (hits.length === 0) break;

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
                  { signal: abortController.signal }
                );
                if (bulkResponse.errors) {
                  const firstError = bulkResponse.items.find(
                    (item) => item.update?.error || item.index?.error || item.create?.error
                  );
                  logger.warn(
                    `IOC indicator bulk reported partial failure (first error: ${JSON.stringify(
                      firstError ?? {}
                    )})`
                  );
                }
                indicatorsWritten += ops.length;
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
            // search_after over [extracted_at, _doc] so we don't
            // docs that share an extracted_at tick with the page boundary.
            if (!lastHit?.sort) {
              throwUnrecoverableError(
                new Error(
                  'Threat report scan returned hits without sort values — cannot paginate safely'
                )
              );
            }
            searchAfter = lastHit.sort;

            if (hits.length < PAGE_SIZE) break;
          }

          if (abortController.signal.aborted) {
            logger.debug(
              `Promote threat indicators aborted after ${reportsProcessed} reports / ${indicatorsWritten} indicators — saving progress`
            );
          }

          const nextState: PromoteThreatIndicatorsState = {
            lastSyncedAt: latestExtractedAt ?? previousState.lastSyncedAt,
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
